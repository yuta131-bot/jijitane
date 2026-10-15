// 公開済みの今日の号を X に投稿する（画像つき本文 → 返信にサイトのリンク）
import fs from 'node:fs';
import path from 'node:path';
import { TwitterApi } from 'twitter-api-v2';
import { renderCard } from '../src/card.mjs';
import { plain, jpDate, todayJst, hourJst } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
if (process.env.SITE_URL) cfg.siteUrl = process.env.SITE_URL;
const date = process.env.TARGET_DATE || todayJst();
const force = process.env.FORCE_POST === 'true';
const dry = process.env.DRY_RUN === 'true';
const STATE = path.join('state', 'posted.json');

const file = path.join('content', `${date}.json`);
if (!fs.existsSync(file)) { console.log(`${date} の号はまだ公開されていません`); process.exit(0); }
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
if (state[date] && !force) { console.log(`${date} は投稿済みです`); process.exit(0); }
if (hourJst() < cfg.postHourJst && !force) { console.log(`投稿は ${cfg.postHourJst} 時以降に行います`); process.exit(0); }

const a = JSON.parse(fs.readFileSync(file, 'utf8'));
const dt = jpDate(date);
const pageUrl = `${cfg.siteUrl.replace(/\/$/, '')}/news/${date}.html`;

// X は全角を2文字として数える（上限280）
const weight = (s) => [...s].reduce((w, ch) => w + (/[\u0000-\u10ff\u2000-\u200d\u2010-\u201f\u2032-\u2037]/.test(ch) ? 1 : 2), 0);
const cut = (s, max) => { let o = ''; for (const ch of s) { if (weight(o + ch) > max) return o + '…'; o += ch; } return o; };

const head = `📰${dt.short}の${cfg.siteName}`;
const lines = a.news.map((n, i) => `${'①②③'[i]}${cut(plain(n.short_title || n.title), 40)}`);
const tags = cfg.hashtags.map((t) => `#${t}`).join(' ');
let quiz = `Q. ${plain(a.news[0].quiz.q)}`;
const build = (q) => `${head}\n\n${lines.join('\n')}\n\n${q}\n答えは図解つきでサイトに👇\n\n${tags}`;
let text = build(quiz);
if (weight(text) > 280) text = build(cut(quiz, Math.max(20, 280 - weight(build('')))));
if (weight(text) > 280) text = cut(text, 279);
const reply = `きょうの記事はこちら（ふりがな・図解・クイズつき）\n${pageUrl}`;

console.log('--- 投稿 ---\n' + text + '\n--- 返信 ---\n' + reply);

const keys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
if (dry || keys.some((k) => !process.env[k])) {
  console.log(dry ? 'DRY_RUN のため投稿しません' : 'X のキーが未設定のため投稿しません（設定方法は README）');
  process.exit(0);
}

const client = new TwitterApi({
  appKey: process.env.X_API_KEY, appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET,
});
const png = await renderCard(a, cfg, path.join('dist', 'og', `${date}.png`));

let mediaId;
try {
  mediaId = await client.v2.uploadMedia(Buffer.from(png), { media_type: 'image/png', media_category: 'tweet_image' });
} catch (e) {
  console.log('v2 の画像アップロードに失敗したので v1.1 で試します:', e?.data?.detail || e.message);
  mediaId = await client.v1.uploadMedia(Buffer.from(png), { mimeType: 'image/png' });
}
try {
  await client.v2.createMediaMetadata?.(mediaId, { alt_text: { text: `${dt.label}の${cfg.siteName}：` + a.news.map((n) => plain(n.short_title)).join('、') } });
} catch { /* 代替テキストは任意 */ }

const t = await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
const r = await client.v2.reply(reply, t.data.id);
state[date] = { tweet: t.data.id, reply: r.data.id, at: new Date().toISOString() };
fs.mkdirSync('state', { recursive: true });
fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
console.log(`投稿しました: https://x.com/i/web/status/${t.data.id}`);
