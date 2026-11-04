// 「今週の時事 6問チャレンジ」を Instagram にカルーセル（横にめくる投稿）で投稿する
//   画像は scripts/make_quiz_carousel.py が quiz-promo/ に作る。Releases（quiz-promo）にのせた URL を Instagram が読み込む
//   投稿の記録は state/quiz-posted.json（同じ週は二度投稿しない）。IG_TOKEN がなければ何もしない
import fs from 'node:fs';
import path from 'node:path';

const END = process.env.END_DATE;
const force = process.env.FORCE_POST === 'true';
const dry = process.env.DRY_RUN === 'true';
const repo = process.env.GITHUB_REPOSITORY || 'yuta131-bot/jijitane';
const DIR = process.env.QUIZ_DIR || 'quiz-promo';
const STATE = path.join('state', 'quiz-posted.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!END) { console.log('END_DATE がありません'); process.exit(1); }

const meta = JSON.parse(fs.readFileSync(path.join(DIR, `quiz-${END}.json`), 'utf8'));
const files = Array.from({ length: meta.count }, (_, i) => `quiz-${END}-${i + 1}.jpg`);
console.log('--- 投稿文 ---\n' + meta.caption + '\n--- 答え ---\n' + meta.answers);
if (dry) { console.log('DRY_RUN のため投稿しません'); process.exit(0); }

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
if (state[END]?.ig && !force) { console.log(`${END} の週は投稿済みです`); process.exit(0); }
if (!process.env.IG_TOKEN) { console.log('IG_TOKEN がないので投稿しません'); process.exit(0); }

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

try {
  const G = 'https://graph.instagram.com/v23.0';
  const token = process.env.IG_TOKEN;
  const me = await call(`${G}/me`, { fields: 'user_id,username', access_token: token }, 'GET');
  const id = me.user_id || me.id;
  const kids = [];
  for (const f of files) {
    const url = `https://github.com/${repo}/releases/download/quiz-promo/${f}`;
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!head.ok) throw new Error(`画像がまだ置かれていません（${head.status}）${url}`);
    kids.push((await call(`${G}/${id}/media`, { image_url: url, is_carousel_item: 'true', access_token: token })).id);
  }
  for (const k of kids) await wait(G, k, token);
  const car = await call(`${G}/${id}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: meta.caption, access_token: token });
  await wait(G, car.id, token);
  const p = await call(`${G}/${id}/media_publish`, { creation_id: car.id, access_token: token });
  state[END] = { ig: p.id, at: new Date().toISOString() };
  fs.mkdirSync('state', { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
  console.log('Instagram に投稿しました:', p.id);
} catch (e) {
  console.error(`Instagram：${e.message}`);
  fs.writeFileSync('quiz-errors.txt', `Instagram：${e.message}`);
  process.exit(1);
}
