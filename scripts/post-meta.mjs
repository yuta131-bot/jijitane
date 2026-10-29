// 公開済みの今日の号を Threads と Instagram（リール）に投稿する
//   Threads：X と同じ画像カード＋見出し＋サイトのリンク（Secrets：THREADS_TOKEN）
//   Instagram：毎朝6時に作ったショート動画をリールで（Secrets：IG_TOKEN）
//   どちらも、キーがなければ何もしない。投稿の記録は state/meta-posted.json
import fs from 'node:fs';
import path from 'node:path';
import { plain, jpDate, todayJst } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
if (process.env.SITE_URL) cfg.siteUrl = process.env.SITE_URL;
const base = cfg.siteUrl.replace(/\/$/, '');
const date = process.env.TARGET_DATE || todayJst();
const force = process.env.FORCE_POST === 'true';
const repo = process.env.GITHUB_REPOSITORY || 'yuta131-bot/jijitane';
const STATE = path.join('state', 'meta-posted.json');
// POST_MODE=quiz のときは、夕方のクイズ動画を Instagram だけに投稿する
const quiz = process.env.POST_MODE === 'quiz';

const file = path.join('content', `${date}.json`);
if (!fs.existsSync(file)) { console.log(`${date} の号はまだありません`); process.exit(0); }
const nowH = (() => { const d = new Date(Date.now() + 9 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; })();
const startH = quiz ? (Number(cfg.quizHourJst) || 18) : (Number(cfg.postHourJst) || 7);
if (nowH < startH && !force) { console.log(`投稿は ${startH} 時以降に行います`); process.exit(0); }

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
state[date] = state[date] || {};
const a = JSON.parse(fs.readFileSync(file, 'utf8'));
const dt = jpDate(date);
const lines = a.news.map((n, i) => `${'①②③'[i]}${plain(n.short_title || n.title)}`).join('\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(url, params, method = 'POST') {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { method });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j)}`);
  return j;
}
const errors = [];

// ---------- Threads ----------
if (quiz) console.log('クイズ動画は Instagram だけに投稿します');
else if (process.env.THREADS_TOKEN && (!state[date].threads || force)) {
  try {
    const T = 'https://graph.threads.net/v1.0';
    const token = process.env.THREADS_TOKEN;
    const text = `${dt.short}の${cfg.siteName}🌱\n\n${lines}\n\nQ. ${plain(a.news[0].quiz.q)}\n答えは図解つきでサイトに👇\n${base}/news/${date}.html\n\n#中学受験`;
    const c = await call(`${T}/me/threads`, { media_type: 'IMAGE', image_url: `${base}/og/${date}.png`, text: [...text].slice(0, 500).join(''), access_token: token });
    await sleep(30000); // 画像の取り込みを待つ（Meta の推奨）
    const p = await call(`${T}/me/threads_publish`, { creation_id: c.id, access_token: token });
    state[date].threads = { id: p.id, at: new Date().toISOString() };
    console.log('Threads に投稿しました:', p.id);
  } catch (e) { errors.push(`Threads：${e.message}`); }
} else console.log(process.env.THREADS_TOKEN ? 'Threads は投稿済みです' : 'THREADS_TOKEN がないので Threads は投稿しません');

// ---------- Instagram（リール） ----------
const igKey = quiz ? 'instagram_quiz' : 'instagram';
if (process.env.IG_TOKEN && (!state[date][igKey] || force)) {
  try {
    const G = 'https://graph.instagram.com/v23.0';
    const token = process.env.IG_TOKEN;
    const video = `https://github.com/${repo}/releases/download/short-${date}/short-${date}${quiz ? '-quiz' : ''}.mp4`;
    const head = await fetch(video, { method: 'HEAD', redirect: 'follow' });
    if (!head.ok) throw new Error(`今日の${quiz ? 'クイズ' : 'ショート'}動画がまだありません（${head.status}）。Actions の「ショート動画を作る」を確認してください`);
    const caption = quiz
      ? `${dt.short}のニュースクイズ🌱 全3問、何問わかるかな？\n答えを見る前に、コメントで予想してみてね！\n\nきょうのニュース\n${lines}\n\n図解つきの解説は、プロフィールのリンク（jijitane.com）から\n音声：VOICEVOX:冥鳴ひまり\n\n#中学受験 #時事問題 #中受 #クイズ #小学生の勉強 #家庭学習`
      : `${dt.short}の${cfg.siteName}🌱\n${lines}\n\nくわしい解説・図解・ふりがなは、プロフィールのリンク（jijitane.com）から\n音声：VOICEVOX:冥鳴ひまり\n\n#中学受験 #時事問題 #中受 #小学生の勉強 #ニュース解説 #家庭学習`;
    const me = await call(`${G}/me`, { fields: 'user_id,username', access_token: token }, 'GET');
    const id = me.user_id || me.id;
    const c = await call(`${G}/${id}/media`, { media_type: 'REELS', video_url: video, caption, share_to_feed: 'true', access_token: token });
    let st = '';
    for (let i = 0; i < 40; i++) { // 動画の処理を最大10分待つ
      await sleep(15000);
      st = (await call(`${G}/${c.id}`, { fields: 'status_code,status', access_token: token }, 'GET')).status_code;
      if (st === 'FINISHED' || st === 'ERROR' || st === 'EXPIRED') break;
    }
    if (st !== 'FINISHED') throw new Error(`動画の処理が終わりませんでした（${st}）`);
    const p = await call(`${G}/${id}/media_publish`, { creation_id: c.id, access_token: token });
    state[date][igKey] = { id: p.id, at: new Date().toISOString() };
    console.log('Instagram にリールを投稿しました:', p.id);
  } catch (e) { errors.push(`Instagram：${e.message}`); }
} else console.log(process.env.IG_TOKEN ? `Instagram（${igKey}）は投稿済みです` : 'IG_TOKEN がないので Instagram は投稿しません');

fs.mkdirSync('state', { recursive: true });
fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
if (errors.length) { console.error(errors.join('\n')); fs.writeFileSync('meta-errors.txt', errors.join('\n')); process.exit(1); }
