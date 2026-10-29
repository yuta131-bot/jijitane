// 週次レポート用に、各SNSの数字を集める
//   X（X_ の4つのキー）、Threads（THREADS_TOKEN）、Instagram（IG_TOKEN）、YouTube（YT_API_KEY）、LINE（LINE_TOKEN）
//   キーがないもの・失敗したものは飛ばして、理由を errors に書く（レポート全体は止めない）
//   出力：reports/data/YYYY-MM-DD.json に "sns" として追記（weekly-stats.mjs のあとに動かす）
import fs from 'node:fs';
import path from 'node:path';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const jstToday = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const day = (base, off) => new Date(Date.parse(base + 'T00:00:00Z') + off * 86400e3).toISOString().slice(0, 10);
const thisWeek = [day(jstToday, -7), day(jstToday, -1)], lastWeek = [day(jstToday, -14), day(jstToday, -8)];
const inRange = (d, [s, e]) => d >= s && d <= e;
const readJson = (f, d = {}) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const getJson = async (url, opt) => { const r = await fetch(url, opt); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; } if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`); return j; };
const sum = (xs, k) => xs.reduce((t, x) => t + (Number(x[k]) || 0), 0);
// 投稿ごとの数字を、今週・先週に分けて合計する
function weeks(posts, keys) {
  const pick = (r) => { const xs = posts.filter((p) => inRange(p.date, r)); return { posts: xs.length, ...Object.fromEntries(keys.map((k) => [k, sum(xs, k)])) }; };
  return { this_week: pick(thisWeek), last_week: pick(lastWeek) };
}
const out = { period: { this_week: thisWeek, last_week: lastWeek }, errors: {} };
const since = lastWeek[0];

// ---------- X ----------
async function x() {
  const keys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  if (keys.some((k) => !process.env[k])) throw new Error('キーがありません');
  const { TwitterApi } = await import('twitter-api-v2');
  const c = new TwitterApi({ appKey: process.env.X_API_KEY, appSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET });
  const st = readJson('state/posted.json');
  const ids = Object.entries(st).filter(([d]) => d >= since).map(([d, v]) => ({ date: d, id: v.tweet })).filter((x) => x.id);
  const me = await c.v2.me({ 'user.fields': ['public_metrics'] });
  const posts = [];
  if (ids.length) {
    const r = await c.v2.tweets(ids.map((x) => x.id), { 'tweet.fields': ['public_metrics'] });
    for (const t of r.data || []) {
      const m = t.public_metrics || {};
      posts.push({ date: ids.find((x) => x.id === t.id).date, impressions: m.impression_count, likes: m.like_count, reposts: m.retweet_count, replies: m.reply_count, bookmarks: m.bookmark_count });
    }
  }
  posts.sort((a, b) => a.date.localeCompare(b.date));
  return { followers: me.data.public_metrics?.followers_count, posts, ...weeks(posts, ['impressions', 'likes', 'reposts', 'bookmarks']) };
}

// ---------- Threads ----------
async function threads() {
  const tk = process.env.THREADS_TOKEN; if (!tk) throw new Error('THREADS_TOKEN がありません');
  const st = readJson('state/meta-posted.json');
  const posts = [];
  for (const [d, v] of Object.entries(st)) {
    if (d < since || !v.threads?.id) continue;
    const j = await getJson(`https://graph.threads.net/v1.0/${v.threads.id}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${tk}`);
    const m = Object.fromEntries((j.data || []).map((x) => [x.name, x.values?.[0]?.value ?? x.total_value?.value ?? 0]));
    posts.push({ date: d, ...m });
  }
  let followers = null;
  try {
    const j = await getJson(`https://graph.threads.net/v1.0/me/threads_insights?metric=followers_count&access_token=${tk}`);
    followers = j.data?.[0]?.total_value?.value ?? null;
  } catch (e) { out.errors.threads_followers = e.message; }
  posts.sort((a, b) => a.date.localeCompare(b.date));
  return { followers, posts, ...weeks(posts, ['views', 'likes', 'replies', 'reposts', 'shares']) };
}

// ---------- Instagram ----------
async function instagram() {
  const tk = process.env.IG_TOKEN; if (!tk) throw new Error('IG_TOKEN がありません');
  const me = await getJson(`https://graph.instagram.com/v23.0/me?fields=username,followers_count,media_count&access_token=${tk}`);
  const st = readJson('state/meta-posted.json');
  const posts = [];
  for (const [d, v] of Object.entries(st)) {
    if (d < since || !v.instagram?.id) continue;
    const j = await getJson(`https://graph.instagram.com/v23.0/${v.instagram.id}/insights?metric=views,reach,likes,comments,saved,shares,total_interactions&access_token=${tk}`);
    const m = Object.fromEntries((j.data || []).map((x) => [x.name, x.values?.[0]?.value ?? x.total_value?.value ?? 0]));
    posts.push({ date: d, ...m });
  }
  posts.sort((a, b) => a.date.localeCompare(b.date));
  return { followers: me.followers_count, media_count: me.media_count, posts, ...weeks(posts, ['views', 'reach', 'likes', 'saved', 'shares']) };
}

// ---------- YouTube（公開されている数字：再生数・いいね・登録者数） ----------
async function youtube() {
  const key = process.env.YT_API_KEY; if (!key) throw new Error('YT_API_KEY がありません');
  const handle = (process.env.YT_HANDLE || cfg.youtubeHandle || '').replace(/^@?/, '@');
  if (handle === '@') throw new Error('チャンネルのハンドル（site.config.json の youtubeHandle）がありません');
  const ch = await getJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${key}`);
  const c = ch.items?.[0]; if (!c) throw new Error(`チャンネル ${handle} が見つかりません`);
  const pl = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=30&playlistId=${c.contentDetails.relatedPlaylists.uploads}&key=${key}`);
  const ids = (pl.items || []).map((x) => x.contentDetails.videoId);
  const posts = [];
  if (ids.length) {
    const v = await getJson(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(',')}&key=${key}`);
    for (const it of v.items || []) {
      const date = new Date(Date.parse(it.snippet.publishedAt) + 9 * 3600e3).toISOString().slice(0, 10);
      if (date < since) continue;
      posts.push({ date, title: it.snippet.title, views: Number(it.statistics.viewCount || 0), likes: Number(it.statistics.likeCount || 0), comments: Number(it.statistics.commentCount || 0) });
    }
  }
  posts.sort((a, b) => a.date.localeCompare(b.date));
  return { subscribers: Number(c.statistics.subscriberCount || 0), total_views: Number(c.statistics.viewCount || 0), video_count: Number(c.statistics.videoCount || 0), posts, ...weeks(posts, ['views', 'likes']) };
}

// ---------- LINE（友だち数。集計は2日ほど遅れて出る） ----------
async function line() {
  const tk = process.env.LINE_TOKEN; if (!tk) throw new Error('LINE_TOKEN がありません');
  const h = { headers: { Authorization: `Bearer ${tk}` } };
  const res = {};
  for (const [k, d] of [['now', day(jstToday, -2)], ['week_ago', day(jstToday, -9)]]) {
    const j = await getJson(`https://api.line.me/v2/bot/insight/followers?date=${d.replace(/-/g, '')}`, h);
    res[k] = { date: d, followers: j.followers ?? null, blocks: j.blocks ?? null, status: j.status };
  }
  try { res.messages_this_month = (await getJson('https://api.line.me/v2/bot/message/quota/consumption', h)).totalUsage; } catch {}
  return res;
}

for (const [name, fn] of [['x', x], ['threads', threads], ['instagram', instagram], ['youtube', youtube], ['line', line]]) {
  try { out[name] = await fn(); console.log(`OK: ${name}`); } catch (e) { out.errors[name] = e.message; console.log(`とばしました: ${name}（${e.message}）`); }
}

const file = path.join('reports/data', `${jstToday}.json`);
const base = readJson(file, null) || {};
base.sns = out;
fs.mkdirSync('reports/data', { recursive: true });
fs.writeFileSync(file, JSON.stringify(base, null, 1));
console.log(`OK: ${file} に sns を追記しました`);
