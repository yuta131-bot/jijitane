// 「覚えるシート」を1日1種類、X と Instagram（カルーセル）に紹介する
//   画像は scripts/make_promo.py が promo/{id}-{n}.jpg に作る。Releases（sheet-promo）にのせた URL を Instagram が読み込む
//   どのシートを出すかは、いちばん長く出していないもの（まだ出していないシートが先）
//   投稿の記録は state/sheets-posted.json。キーがなければ、その SNS は何もしない
import fs from 'node:fs';
import path from 'node:path';
import { loadSheets } from '../src/sheets.mjs';
import { plain } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
if (process.env.SITE_URL) cfg.siteUrl = process.env.SITE_URL;
const base = cfg.siteUrl.replace(/\/$/, '');
const repo = process.env.GITHUB_REPOSITORY || 'yuta131-bot/jijitane';
const force = process.env.FORCE_POST === 'true';
const dry = process.env.DRY_RUN === 'true';
const PROMO = process.env.PROMO_DIR || 'promo';
const STATE = path.join('state', 'sheets-posted.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const imgs = (id) => fs.existsSync(PROMO) ? fs.readdirSync(PROMO).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.jpg')).sort((a, b) => parseInt(a.split('-').pop()) - parseInt(b.split('-').pop())) : [];
const sheets = loadSheets().filter((s) => imgs(s.id).length);
if (!sheets.length) { console.log('投稿に使える画像がありません'); process.exit(0); }

// 選ぶ：指定があればそれ。なければ、いちばん長く出していないもの
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const last = (s) => Math.max(0, ...['x', 'ig'].map((k) => Date.parse(state[s.id]?.[k] || 0) || 0));
// 同じ日にやり直したときは、朝選んだシートを続ける（Xだけ成功してインスタが失敗した日などのため）
const pickedToday = state._today?.date === today ? state._today.id : '';
let sheet = process.env.SHEET_ID ? sheets.find((s) => s.id === process.env.SHEET_ID)
  : (pickedToday && sheets.find((s) => s.id === pickedToday)) || [...sheets].sort((a, b) => last(a) - last(b))[0];
if (!sheet) { console.log(`シート ${process.env.SHEET_ID} が見つかりません`); process.exit(1); }
const files = imgs(sheet.id);
const title = plain(sheet.title), sub = plain(sheet.sub || '');
state[sheet.id] = state[sheet.id] || {};
state._today = { date: today, id: sheet.id };
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `sheet_id=${sheet.id}\n`);
console.log(`今日のシート：${sheet.id}（${title}／${files.length}ページ）`);

// ---------- 文面 ----------
const weight = (s) => [...s].reduce((w, ch) => w + (/[\u0000-ჿ -‍‐-‟′-‷]/.test(ch) ? 1 : 2), 0);
const xText = (() => {
  const mk = (tags) => `【覚えるシート】${title}\n${sub}\n\n印刷OKのPDFを、LINEでプレゼント中。\n「シート」と送ると届きます\n${cfg.lineUrl}${tags ? '\n\n#中学受験 #家庭学習' : ''}`;
  const w = (t) => weight(t.replace(cfg.lineUrl, 'x'.repeat(23)));   // URL は長さに関係なく23と数える
  return w(mk(true)) > 280 ? mk(false) : mk(true);
})();
const igCaption = `【覚えるシート】${title}\n${sub}\n\n保存して、見返してね。印刷できるPDF（A4）は、LINEで「シート」と送ると届きます。\nLINEは、プロフィールのリンク（jijitane.com）の「覚えるシート」から友だち追加できます。\n\n全${sheets.length}種類の覚えるシートを、1日1つずつ紹介しています。\n\n#中学受験 #中受 #家庭学習 #小学生の勉強 #受験勉強 #覚えるシート`;
console.log('--- X ---\n' + xText + '\n--- Instagram ---\n' + igCaption);
if (dry) { console.log('DRY_RUN のため投稿しません'); process.exit(0); }

const errors = [];

// ---------- X（画像は4枚まで） ----------
const xKeys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
if (xKeys.every((k) => process.env[k]) && (state[sheet.id].xDay !== today || force)) {
  try {
    const { TwitterApi } = await import('twitter-api-v2');
    const client = new TwitterApi({ appKey: process.env.X_API_KEY, appSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET });
    const ids = [];
    for (const f of files.slice(0, 4)) {
      const buf = fs.readFileSync(path.join(PROMO, f));
      try { ids.push(await client.v2.uploadMedia(buf, { media_type: 'image/jpeg', media_category: 'tweet_image' })); }
      catch (e) { console.log('v2 の画像アップロードに失敗したので v1.1 で試します:', e?.data?.detail || e.message); ids.push(await client.v1.uploadMedia(buf, { mimeType: 'image/jpeg' })); }
    }
    const t = await client.v2.tweet({ text: xText, media: { media_ids: ids } });
    state[sheet.id].x = new Date().toISOString(); state[sheet.id].xDay = today; state[sheet.id].xId = t.data.id;
    console.log(`X に投稿しました: https://x.com/i/web/status/${t.data.id}`);
  } catch (e) { errors.push(`X：${e?.data?.detail || e.message}`); }
} else console.log(xKeys.every((k) => process.env[k]) ? 'X は、今日の分を投稿済みです' : 'X のキーがないので X は投稿しません');

// ---------- Instagram（カルーセル：10枚まで） ----------
async function call(url, params, method = 'POST') {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { method });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j)}`);
  return j;
}
async function wait(G, id, token) {
  let st = '', detail = '';
  for (let i = 0; i < 40; i++) {
    await sleep(6000);
    const r = await call(`${G}/${id}`, { fields: 'status_code,status', access_token: token }, 'GET');
    st = r.status_code; detail = r.status || '';
    if (st === 'FINISHED' || st === 'ERROR' || st === 'EXPIRED') break;
  }
  if (st !== 'FINISHED') throw new Error(`画像の処理が終わりませんでした（${st}）${detail}`);
}
if (process.env.IG_TOKEN && (state[sheet.id].igDay !== today || force)) {
  try {
    const G = 'https://graph.instagram.com/v23.0';
    const token = process.env.IG_TOKEN;
    const me = await call(`${G}/me`, { fields: 'user_id,username', access_token: token }, 'GET');
    const id = me.user_id || me.id;
    const kids = [];
    for (const f of files.slice(0, 10)) {
      const url = `https://github.com/${repo}/releases/download/sheet-promo/${f}`;
      const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (!head.ok) throw new Error(`画像がまだ置かれていません（${head.status}）${url}`);
      const c = await call(`${G}/${id}/media`, { image_url: url, is_carousel_item: 'true', access_token: token });
      kids.push(c.id);
    }
    for (const k of kids) await wait(G, k, token);
    const car = await call(`${G}/${id}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: igCaption, access_token: token });
    await wait(G, car.id, token);
    const p = await call(`${G}/${id}/media_publish`, { creation_id: car.id, access_token: token });
    state[sheet.id].ig = new Date().toISOString(); state[sheet.id].igDay = today; state[sheet.id].igId = p.id;
    console.log('Instagram にカルーセルを投稿しました:', p.id);
  } catch (e) { errors.push(`Instagram：${e.message}`); }
} else console.log(process.env.IG_TOKEN ? 'Instagram は、今日の分を投稿済みです' : 'IG_TOKEN がないので Instagram は投稿しません');

fs.mkdirSync('state', { recursive: true });
fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
if (errors.length) { console.error(errors.join('\n')); fs.writeFileSync('sheet-errors.txt', errors.join('\n')); process.exit(1); }
