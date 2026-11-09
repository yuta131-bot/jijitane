// 週次レポートの「数字の部分」を、表とグラフ（Mermaid）で作る。文章は Claude、数字はここ（計算ミスを防ぐため）。
//   使い方：node scripts/render-tables.mjs reports/data/YYYY-MM-DD.json [daily-snapshots のフォルダ] > reports/YYYY-MM-DD.tables.md
import fs from 'node:fs';
const [file, snapDir = 'analytics-in/daily'] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const n = (v) => (v == null ? '-' : Number(v).toLocaleString('en-US'));
const diff = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 1000) / 10}%` : '-');
const arrow = (a, b) => (a > b ? '↑' : a < b ? '↓' : '→');
const md = (d_) => d_.slice(5).replace('-', '/');
const bar = (v, max) => '█'.repeat(max ? Math.round((v / max) * 12) : 0) || '▏';
const table = (head, rows, left = [0]) => [`| ${head.join(' | ')} |`, `|${head.map((_, i) => (left.includes(i) ? ':---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out = [];
const tw = d.this_week, lw = d.last_week;

out.push(`# 週次レポート ${d.period.this_week[0]} 〜 ${d.period.this_week[1]}`, '');
out.push('## 数字のまとめ', '');
out.push(table(['', '今週', '先週', '増減'], [
  ['ページビュー', n(tw.pageviews), n(lw.pageviews), `${arrow(tw.pageviews, lw.pageviews)} ${diff(tw.pageviews, lw.pageviews)}`],
  ['訪問数', n(tw.visits), n(lw.visits), `${arrow(tw.visits, lw.visits)} ${diff(tw.visits, lw.visits)}`],
  ['公開した記事', n(d.articles_published?.length ?? 0), '-', '-'],
]), '');

// 日別（今週）と先週の同じ曜日
const max = Math.max(1, ...tw.daily.map((x) => x.pageviews));
out.push('## 日別のアクセス', '');
out.push(table(['日', 'PV', '訪問', '先週の同じ曜日のPV', 'グラフ'], tw.daily.map((x, i) => [md(x.date), n(x.pageviews), n(x.visits), n(lw.daily[i]?.pageviews), bar(x.pageviews, max)]), [0, 4]), '');
out.push('```mermaid', 'xychart-beta', '  title "1日ごとのページビュー（棒：今週、線：先週）"',
  `  x-axis [${tw.daily.map((x) => `"${md(x.date)}"`).join(', ')}]`, '  y-axis "PV" 0 --> ' + Math.max(10, Math.ceil(Math.max(max, ...lw.daily.map((x) => x.pageviews)) * 1.2)),
  `  bar [${tw.daily.map((x) => x.pageviews).join(', ')}]`, `  line [${lw.daily.map((x) => x.pageviews).join(', ')}]`, '```', '',
  '※1日の数字は少ないとぶれやすいので、判断は週の合計で行います。', '');

out.push('## よく読まれたページ トップ10', '');
out.push(table(['順位', 'ページ', 'PV'], tw.pages.slice(0, 10).map((p, i) => [i + 1, `\`${p.key}\``, n(p.pageviews)]), [1]), '');
if (tw.line?.length) out.push('LINEボタン（「LINEで受け取る」）を押された数', '', table(['押されたページ', '回数'], tw.line.slice(0, 10).map((p) => [`\`${p.key}\``, n(p.pageviews)]), [1]), '');
const rtot = tw.referrers.reduce((t, r) => t + r.pageviews, 0) || 1;
out.push('## どこから来たか', '');
out.push(table(['流入元', 'PV', '割合'], tw.referrers.slice(0, 8).map((r) => [r.key, n(r.pageviews), `${Math.round((r.pageviews / rtot) * 100)}%`])), '');
const dtot = tw.devices.reduce((t, r) => t + r.pageviews, 0) || 1;
out.push(table(['端末', 'PV', '割合'], tw.devices.map((r) => [r.key, n(r.pageviews), `${Math.round((r.pageviews / dtot) * 100)}%`])), '');

// SNS
const s = d.sns;
if (s) {
  out.push('## SNS', '');
  const rows = [];
  const row = (name, fol, k, label) => { const a = s[k]; if (!a) return; const t = a.this_week || {}, l = a.last_week || {}; rows.push([name, n(fol), n(t.posts), n(t[label]), n(l[label]), t[label] != null && l[label] != null ? diff(t[label], l[label]) : '-']); };
  row('X', s.x?.followers, 'x', 'impressions');
  row('Threads', s.threads?.followers, 'threads', 'views');
  row('Instagram', s.instagram?.followers, 'instagram', 'views');
  row('YouTube', s.youtube?.subscribers, 'youtube', 'views');
  if (s.line) rows.push(['LINE（友だち）', n(s.line.now?.followers), '-', '-', '-', s.line.week_ago?.followers != null ? `1週間で ${n((s.line.now?.followers ?? 0) - s.line.week_ago.followers)}人` : '-']);
  out.push(table(['SNS', 'フォロワー等', '今週の投稿', '今週の表示', '先週の表示', '増減'], rows), '');
  const bk = s.instagram?.by_kind;
  if (bk) {
    out.push('Instagram：1本あたり（今週）', '');
    out.push(table(['種類', '本数', '表示/本', 'いいね/本', 'コメント/本', '保存/本'], Object.entries(bk).map(([k, v]) => { const t = v.this_week, p = Math.max(1, t.posts); return [k, t.posts, n(Math.round(t.views / p)), (t.likes / p).toFixed(1), (t.comments / p).toFixed(1), (t.saved / p).toFixed(1)]; })), '');
  }
  const errs = Object.entries(s.errors || {});
  if (errs.length) out.push('取れなかった数字：' + errs.map(([k, v]) => `${k}（${String(v).slice(0, 60)}）`).join('、'), '');
}

// 毎日の記録（analytics ブランチ）からフォロワーの推移
try {
  const files = fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).sort().slice(-30);
  const snaps = files.map((f) => JSON.parse(fs.readFileSync(`${snapDir}/${f}`, 'utf8')));
  if (snaps.length >= 2) {
    out.push('## フォロワー・登録者の推移（毎日の記録）', '');
    const keys = ['x', 'threads', 'instagram', 'youtube', 'line'].filter((k) => snaps.some((x) => x.followers?.[k] != null));
    const last7 = snaps.slice(-7);
    out.push(table(['日', ...keys], last7.map((x) => [md(x.date), ...keys.map((k) => n(x.followers?.[k]))])), '');
    const xs = snaps.map((x) => `"${md(x.date)}"`).join(', ');
    const pal = keys.filter((k) => snaps.some((x) => (x.followers?.[k] ?? 0) > 0));
    for (const k of pal) {
      const vals = snaps.map((x) => x.followers?.[k] ?? 0), hi = Math.max(...vals);
      out.push('```mermaid', 'xychart-beta', `  title "${k} フォロワー等の推移"`, `  x-axis [${xs}]`, `  y-axis "人" 0 --> ${Math.max(5, Math.ceil(hi * 1.2))}`, `  line [${vals.join(', ')}]`, '```', '');
    }
  } else out.push('## フォロワー・登録者の推移', '', '毎日の記録がたまり次第（2日分以上）、ここに表とグラフが出ます。', '');
} catch { out.push('## フォロワー・登録者の推移', '', '毎日の記録がたまり次第、ここに表とグラフが出ます。', ''); }

// X
const x = d.x_posts;
if (x) { out.push('## X の投稿と費用の目安', '', table(['項目', '値'], [['今週の投稿回数', n(x.this_week)], ['今週のおおよその費用', `$${x.est_cost_usd}`], ['クレジット残りの見込み', `$${x.est_remaining_usd}（あと約${x.est_days_left}日）`]]), '', '※実際の残高は developer.x.com の Developer Console で確認してください。', ''); }
console.log(out.join('\n'));
