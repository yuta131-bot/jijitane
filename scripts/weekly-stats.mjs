// 週次レポート用のアクセス数を集める（Cloudflare Web Analytics）
//   必要な Secrets：CF_API_TOKEN（Account Analytics: Read）、CF_ACCOUNT_ID
//   出力：reports/data/YYYY-MM-DD.json（直近7日と、その前の7日）
import fs from 'node:fs';
import path from 'node:path';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const host = new URL(cfg.siteUrl).host;
const token = process.env.CF_API_TOKEN, account = process.env.CF_ACCOUNT_ID;
if (!token || !account) { console.error('CF_API_TOKEN / CF_ACCOUNT_ID がありません'); process.exit(1); }

// 日本時間の「きのう」までの7日間を今週とする
const jstToday = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const day = (base, off) => new Date(Date.parse(base + 'T00:00:00Z') + off * 86400e3).toISOString().slice(0, 10);
const days = Array.from({ length: 14 }, (_, i) => day(jstToday, i - 14)); // 古い順に14日
const Q = `query($a: string!, $s: Time!, $e: Time!, $h: string!) { viewer { accounts(filter: {accountTag: $a}) {
  total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {datetime_geq: $s, datetime_lt: $e, requestHost: $h}) { count sum { visits } }
  paths: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: {datetime_geq: $s, datetime_lt: $e, requestHost: $h}) { count sum { visits } dimensions { requestPath } }
  refs: rumPageloadEventsAdaptiveGroups(limit: 50, orderBy: [count_DESC], filter: {datetime_geq: $s, datetime_lt: $e, requestHost: $h}) { count dimensions { refererHost } }
  devices: rumPageloadEventsAdaptiveGroups(limit: 10, orderBy: [count_DESC], filter: {datetime_geq: $s, datetime_lt: $e, requestHost: $h}) { count dimensions { deviceType } }
} } }`;

async function q(d) {
  // 日本時間の1日（前日15:00Z〜当日15:00Z）
  const s = new Date(Date.parse(d + 'T00:00:00+09:00')).toISOString();
  const e = new Date(Date.parse(d + 'T00:00:00+09:00') + 86400e3).toISOString();
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: Q, variables: { a: account, s, e, h: host } })
  });
  const j = await r.json();
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors));
  return j.data.viewer.accounts[0] || {};
}

const add = (m, k, v) => { if (k == null || k === '') k = '（直接・不明）'; m[k] = (m[k] || 0) + v; };
function summarize(list) {
  const out = { pageviews: 0, visits: 0, daily: [], pages: {}, referrers: {}, devices: {} };
  for (const { date, d } of list) {
    const pv = d.total?.[0]?.count || 0, vi = d.total?.[0]?.sum?.visits || 0;
    out.pageviews += pv; out.visits += vi; out.daily.push({ date, pageviews: pv, visits: vi });
    (d.paths || []).forEach((x) => add(out.pages, x.dimensions.requestPath.replace(/\.html$/, '').replace(/\/index$/, '/'), x.count));
    (d.refs || []).forEach((x) => add(out.referrers, x.dimensions.refererHost === host ? '（サイト内）' : x.dimensions.refererHost, x.count));
    (d.devices || []).forEach((x) => add(out.devices, x.dimensions.deviceType, x.count));
  }
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, pageviews: v }));
  return { ...out, pages: top(out.pages, 20), referrers: top(out.referrers, 15), devices: top(out.devices, 5) };
}

const raw = [];
for (const d of days) raw.push({ date: d, d: await q(d) });
const prev = summarize(raw.slice(0, 7)), cur = summarize(raw.slice(7));
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
const result = {
  site: cfg.siteUrl, generated_at: new Date().toISOString(),
  period: { this_week: [days[7], days[13]], last_week: [days[0], days[6]] },
  this_week: cur, last_week: prev,
  change_pct: { pageviews: pct(cur.pageviews, prev.pageviews), visits: pct(cur.visits, prev.visits) },
  // X の自動投稿（画像つき投稿 0.015ドル＋リンクつき返信 0.20ドル）の回数と、おおよその費用
  x_posts: (() => {
    let p = {}; try { p = JSON.parse(fs.readFileSync('state/posted.json', 'utf8')); } catch {}
    const inWeek = Object.keys(p).filter((d) => d >= days[7] && d <= days[13]).length;
    return { this_week: inWeek, est_cost_usd: Math.round(inWeek * 0.215 * 100) / 100, per_month_est_usd: Math.round(0.215 * 30 * 100) / 100 };
  })(),
  articles_published: fs.readdirSync('content').filter((f) => f >= days[7] && f <= days[13] + '.json').sort()
};
fs.mkdirSync('reports/data', { recursive: true });
const file = path.join('reports/data', `${jstToday}.json`);
fs.writeFileSync(file, JSON.stringify(result, null, 1));
console.log(`OK: ${file}  PV ${cur.pageviews}（先週 ${prev.pageviews}）`);
