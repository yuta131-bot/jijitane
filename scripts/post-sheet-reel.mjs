// 「覚えるシート」の紹介動画（12時に作るもの）を、Instagram のリールにも投稿する
//   動画は sheet-promo.yml が Releases（sheet-promo）に sheet-{id}.mp4 としてのせる。Instagram がそこから読み込む
//   投稿の記録は state/sheets-posted.json（カルーセルとは別に igReel / igReelDay）。IG_TOKEN がなければ何もしない
import fs from 'node:fs';
import path from 'node:path';
import { loadSheets } from '../src/sheets.mjs';
import { plain } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const repo = process.env.GITHUB_REPOSITORY || 'yuta131-bot/jijitane';
const force = process.env.FORCE_POST === 'true';
const dry = process.env.DRY_RUN === 'true';
const STATE = path.join('state', 'sheets-posted.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const sid = process.env.SHEET_ID || state._today?.id;
const sheets = loadSheets();
const sheet = sheets.find((s) => s.id === sid);
if (!sheet) { console.log('今日のシートが分かりません'); process.exit(0); }
state[sid] = state[sid] || {};
const title = plain(sheet.title), sub = plain(sheet.sub || '');
const caption = `【覚えるシート】${title}\n${sub}\n\n動画で、ポイントをさっと見よう。くわしい表は、同じ日の投稿のスライドで。\n\n印刷してポスターにして、トイレ・部屋・食卓に貼って、毎日ながめて覚えるのもおすすめです。\nA4で印刷できるPDFは、LINEで「シート」と送ると届きます（友だち追加は、プロフィールのリンクから）。\n\n全${sheets.length}種類の覚えるシートを、1日1つずつ紹介しています。\n\n#中学受験 #中受 #家庭学習 #小学生の勉強 #受験勉強 #覚えるシート`;
console.log(`リール：${sid}\n${caption}`);
if (dry) { console.log('DRY_RUN のため投稿しません'); process.exit(0); }
if (!process.env.IG_TOKEN) { console.log('IG_TOKEN がないので、リールは投稿しません'); process.exit(0); }
if (state[sid].igReelDay === today && !force) { console.log('リールは、今日の分を投稿済みです'); process.exit(0); }

async function call(url, params, method = 'POST') {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { method });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j)}`);
  return j;
}
try {
  const G = 'https://graph.instagram.com/v23.0';
  const token = process.env.IG_TOKEN;
  const video = `https://github.com/${repo}/releases/download/sheet-promo/sheet-${sid}.mp4`;
  const head = await fetch(video, { method: 'HEAD', redirect: 'follow' });
  if (!head.ok) throw new Error(`動画がまだ置かれていません（${head.status}）${video}`);
  const me = await call(`${G}/me`, { fields: 'user_id,username', access_token: token }, 'GET');
  const id = me.user_id || me.id;
  let c, st = '', detail = '';
  for (let attempt = 1; attempt <= 2; attempt++) {      // Meta 側の一時的な失敗が時々あるので、1回だけやり直す
    c = await call(`${G}/${id}/media`, { media_type: 'REELS', video_url: video, caption, share_to_feed: 'true', access_token: token });
    st = '';
    for (let i = 0; i < 40; i++) {
      await sleep(15000);
      const r = await call(`${G}/${c.id}`, { fields: 'status_code,status', access_token: token }, 'GET');
      st = r.status_code; detail = r.status || '';
      if (st === 'FINISHED' || st === 'ERROR' || st === 'EXPIRED') break;
    }
    if (st === 'FINISHED') break;
    console.log(`動画の処理：${st}（${attempt}回目）${detail}`);
    if (st !== 'ERROR' && st !== 'EXPIRED') break;
  }
  if (st !== 'FINISHED') throw new Error(`動画の処理が終わりませんでした（${st}）${detail}`);
  const p = await call(`${G}/${id}/media_publish`, { creation_id: c.id, access_token: token });
  state[sid].igReel = new Date().toISOString(); state[sid].igReelDay = today; state[sid].igReelId = p.id;
  console.log('Instagram にリールを投稿しました:', p.id);
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
} catch (e) {
  console.error(`Instagramリール：${e.message}`);
  fs.writeFileSync('sheet-reel-errors.txt', `Instagramリール：${e.message}`);
  process.exit(1);
}
