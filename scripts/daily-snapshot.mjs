// 毎日1回、「その日にしか取れない数字」（フォロワー数・登録者数）と、きのうのPVを記録する。
//   出力：snapshots-out/daily/YYYY-MM-DD.json（workflow が analytics ブランチへ保存）
//   異常（PVゼロ・自動投稿が止まっている）があれば alerts に入れ、workflow が GitHub Issue で知らせる。
//   キーがないSNSは飛ばす（全体は止めない）。
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const host = new URL(cfg.siteUrl).host;
const jst = (off = 0) => new Date(Date.now() + 9 * 3600e3 + off * 86400e3).toISOString().slice(0, 10);
const today = jst(), yday = jst(-1);
const getJson = async (url, opt) => { const r = await fetch(url, opt); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; } if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j).slice(0, 200)}`); return j; };
const out = { date: today, recorded_at: new Date().toISOString(), errors: {}, alerts: [] };

// きのう（日本時間）のPV・訪問数
try {
  const { CF_API_TOKEN: t, CF_ACCOUNT_ID: a } = process.env; if (!t || !a) throw new Error('CF_API_TOKEN / CF_ACCOUNT_ID がありません');
  const s = new Date(Date.parse(yday + 'T00:00:00+09:00')).toISOString(), e = new Date(Date.parse(yday + 'T00:00:00+09:00') + 86400e3).toISOString();
  const q = `query($a:string!,$s:Time!,$e:Time!,$h:string!){viewer{accounts(filter:{accountTag:$a}){total:rumPageloadEventsAdaptiveGroups(limit:1,filter:{datetime_geq:$s,datetime_lt:$e,requestHost:$h}){count sum{visits}}}}}`;
  const j = await getJson('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { a, s, e, h: host } }) });
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 200));
  const r = j.data.viewer.accounts[0]?.total?.[0];
  out.pv = { date: yday, pageviews: r?.count || 0, visits: r?.sum?.visits || 0 };
  if (out.pv.pageviews === 0) out.alerts.push(`きのう（${yday}）のPVが0です。サイトが表示されていないか、計測が止まっている可能性があります。`);
} catch (e) { out.errors.pv = e.message; }

// フォロワー数・登録者数（今日の時点の数字）
const snap = {
  x: async () => { const k = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']; if (k.some((n) => !process.env[n])) throw new Error('キーなし'); const { TwitterApi } = await import('twitter-api-v2'); const c = new TwitterApi({ appKey: process.env.X_API_KEY, appSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET }); return (await c.v2.me({ 'user.fields': ['public_metrics'] })).data.public_metrics?.followers_count ?? null; },
  threads: async () => { const t = process.env.THREADS_TOKEN; if (!t) throw new Error('キーなし'); return (await getJson(`https://graph.threads.net/v1.0/me/threads_insights?metric=followers_count&access_token=${t}`)).data?.[0]?.total_value?.value ?? null; },
  instagram: async () => { const t = process.env.IG_TOKEN; if (!t) throw new Error('キーなし'); return (await getJson(`https://graph.instagram.com/v23.0/me?fields=followers_count&access_token=${t}`)).followers_count ?? null; },
  youtube: async () => { const k = process.env.YT_API_KEY, h = (process.env.YT_HANDLE || cfg.youtubeHandle || '').replace(/^@?/, '@'); if (!k || h === '@') throw new Error('キーまたはハンドルなし'); const c = (await getJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(h)}&key=${k}`)).items?.[0]; if (!c) throw new Error('チャンネルなし'); return Number(c.statistics.subscriberCount || 0); },
  line: async () => { const t = process.env.LINE_TOKEN; if (!t) throw new Error('キーなし'); const d = jst(-2).replace(/-/g, ''); return (await getJson(`https://api.line.me/v2/bot/insight/followers?date=${d}`, { headers: { Authorization: `Bearer ${t}` } })).followers ?? null; },
};
out.followers = {};
for (const [n, f] of Object.entries(snap)) { try { out.followers[n] = await f(); } catch (e) { out.errors[n] = e.message; } }

// 自動投稿が止まっていないか（X：朝の投稿が今日のぶんまで記録されているはず。投稿は日本時間7:30なので、実行は9時以降）
try {
  const p = JSON.parse(fs.readFileSync('state/posted.json', 'utf8'));
  const last = Object.keys(p).sort().pop();
  if (last && last < jst(-1)) out.alerts.push(`X の自動投稿の最終記録が ${last} です。2日以上止まっている可能性があります。`);
} catch {}

fs.mkdirSync('snapshots-out/daily', { recursive: true });
fs.writeFileSync(`snapshots-out/daily/${today}.json`, JSON.stringify(out, null, 1));
fs.writeFileSync('snapshots-out/alerts.txt', out.alerts.join('\n'));
console.log(JSON.stringify(out));
