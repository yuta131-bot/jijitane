// LINE 公式アカウントで「今週のふり返り号」を友だち全員に送る（毎週日曜の夜）
//   必要な Secrets：LINE_TOKEN（Messaging API のチャネルアクセストークン（長期））
//   DRY_RUN=true なら送らずに中身だけ表示する
import fs from 'node:fs';
import crypto from 'node:crypto';
import { mondayOf, weekData, weekLabel } from '../src/matome.mjs';
import { plain, todayJst } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const base = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '');
const START = '2026-11-01'; // この日から配信を始める
const today = process.env.TARGET_DATE || todayJst();
const dry = process.env.DRY_RUN === 'true';
// お試し（DRY_RUN）のときは、LINE_TOKEN が正しいかだけ確かめる（メッセージは送らない）
if (dry && process.env.LINE_TOKEN) {
  const r = await fetch('https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${process.env.LINE_TOKEN}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`LINE_TOKEN が使えません（${r.status}）: ${JSON.stringify(j)}`); process.exit(1); }
  console.log(`LINE_TOKEN OK：${j.displayName}（${j.basicId}）`);
}
if (today < START && !dry) { console.log(`${START} から配信します`); process.exit(0); }

const all = fs.readdirSync('content').filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(`content/${f}`, 'utf8')));
const mon = mondayOf(today);
const w = weekData(mon, all.filter((a) => a.date <= today));
if (!w.items.length) { console.log('この週の記事がありません'); process.exit(0); }

const stateFile = 'state/line-posted.json';
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
if (state[mon] && !dry && process.env.FORCE_POST !== 'true') { console.log('この週はもう送りました'); process.exit(0); }

const text = [
  `【今週のふり返り号】${weekLabel(mon)}`,
  '',
  '今週の大事なニュース',
  ...w.main.map((x) => `・${plain(x.n.short_title || x.n.title)}`),
  '',
  '印刷できる「1枚プリント」（PDF）と確認テストはこちら',
  `${base}/weekly/${mon}.html`,
  '',
  '週末に親子で5分、見直してみてください。',
].join('\n');
console.log(text);
if (dry) process.exit(0);
if (!process.env.LINE_TOKEN) { console.log('LINE_TOKEN がないので送りません'); process.exit(0); }

const r = await fetch('https://api.line.me/v2/bot/message/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_TOKEN}`, 'X-Line-Retry-Key': crypto.randomUUID() },
  body: JSON.stringify({ messages: [{ type: 'text', text }] }),
});
if (!r.ok) { console.error(`LINE への送信に失敗しました（${r.status}）: ${await r.text()}`); process.exit(1); }
state[mon] = { at: new Date().toISOString() };
fs.mkdirSync('state', { recursive: true });
fs.writeFileSync(stateFile, JSON.stringify(state, null, 1) + '\n');
console.log('送信しました');
