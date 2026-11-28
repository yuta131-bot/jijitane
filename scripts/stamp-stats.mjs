// スタンプ帳の匿名集計を、週次レポート用の表（Markdown）にして出力する
//   必要な環境変数：STAMP_STATS_URL（Worker の /stats の URL のもと）、STAMP_STATS_TOKEN。無ければ何も出さない
const url = process.env.STAMP_STATS_URL, token = process.env.STAMP_STATS_TOKEN;
if (!url || !token) process.exit(0);
const r = await fetch(`${url.replace(/\/$/, '')}/stats?days=14`, { headers: { Authorization: `Bearer ${token}` } });
if (!r.ok) { console.error('スタンプ集計を取れませんでした', r.status); process.exit(1); }
const { days } = await r.json();
const sum = (a, k) => a.reduce((n, x) => n + (x[k] || 0), 0);
const w = days.slice(-7), p = days.slice(0, 7);
const row = (l, k) => `| ${l} | ${sum(w, k)} | ${sum(p, k)} |`;
console.log(`\n## スタンプ帳（匿名の回数。延べ人数）\n\n| 項目 | 今週 | 前の週 |\n|---|---:|---:|\n${row('スタンプを押した人（のべ）', 'active')}\n${row('はじめて押した人', 'new')}\n${row('5個に届いた人', 'r5')}\n${row('10個に届いた人', 'r10')}\n${row('20個以上に届いた人', 'r20')}\n\n日ごと（今週）：${w.map((x) => `${x.date.slice(5)} ${x.active}`).join('／')}\n`);
