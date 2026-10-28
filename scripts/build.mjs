// content/*.json からサイト（dist/）を作る
import fs from 'node:fs';
import path from 'node:path';
import { articlePage, listPage, staticPage, newsPage, glossaryPage, unitsPage } from '../src/templates.mjs';
import { renderCard } from '../src/card.mjs';
import { esc, plain, jpDate, setSayKeys } from '../src/markup.mjs';
import { sayKeys } from '../src/readings.mjs';
import { validate, validateMatome } from '../src/schema.mjs';
import { flatNews, examYearOf, mondayOf, addDays, hubPage, monthPage, yearPage, rankingPage, weekData, weeklyPage, printHtml } from '../src/matome.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
if (process.env.SITE_URL) cfg.siteUrl = process.env.SITE_URL;
const css = fs.readFileSync('src/style.css', 'utf8');
const OUT = 'dist';

const files = fs.readdirSync('content').filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
const all = files.map((f) => {
  const a = JSON.parse(fs.readFileSync(path.join('content', f), 'utf8'));
  const errs = validate(a);
  if (errs.length) throw new Error(`${f} に問題があります:\n- ${errs.join('\n- ')}`);
  return a;
});
const desc = [...all].reverse(); // 新しい順
setSayKeys(await sayKeys(all));

// まとめページの元になるデータ
const flat = flatNews(all);
const newsByKey = new Map(flat.map((x) => [x.key, x]));
const examYear = desc[0] ? examYearOf(desc[0].date) : null;
let year = null;
const yf = path.join('content', 'matome', `${examYear}.json`);
if (examYear && fs.existsSync(yf)) {
  year = JSON.parse(fs.readFileSync(yf, 'utf8'));
  const errs = validateMatome(year, new Set(newsByKey.keys()));
  if (errs.length) { console.warn(`${yf} に問題があるため、年間まとめは出しません:\n- ${errs.join('\n- ')}`); year = null; }
}
const months = [...new Set(all.map((a) => a.date.slice(0, 7)))].sort();
const weeks = [...new Set(all.map((a) => mondayOf(a.date)))].sort();
cfg.matomeLinks = [
  ...(year ? [[`/matome/${year.exam_year}.html`, `${year.exam_year}年入試 時事問題まとめ`], [`/matome/${year.exam_year}-ranking.html`, '出題予想ランキング TOP20']] : []),
  ...(weeks.length ? [[`/weekly/${weeks[weeks.length - 1]}.html`, '今週のふり返り（1枚プリント）']] : []),
  ...(months.length ? [[`/matome/${months[months.length - 1]}.html`, `${Number(months[months.length - 1].slice(5))}月の時事ニュースまとめ`]] : []),
  ['/matome/', '時事まとめ一覧'],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'news'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'subject'), { recursive: true });

for (let i = 0; i < all.length; i++) {
  const a = all[i];
  const html = articlePage({ cfg, css, a, prev: all[i - 1]?.date, next: all[i + 1]?.date, recent: desc.filter((x) => x.date !== a.date) });
  fs.writeFileSync(path.join(OUT, 'news', `${a.date}.html`), html);
  await renderCard(a, cfg, path.join(OUT, 'og', `${a.date}.png`));
  a.news.forEach((n, j) => fs.writeFileSync(path.join(OUT, 'news', `${a.date}-${j + 1}.html`), newsPage({ cfg, css, a, i: j, recent: desc.filter((x) => x.date !== a.date) })));
}

// 用語集・単元別
const gl = new Map();
const un = new Map();
for (const a of desc) a.news.forEach((n, i) => {
  const ref = { date: a.date, i, title: plain(n.short_title || n.title) };
  for (const k of n.keywords || []) { const term = plain(k.term); if (!gl.has(term)) gl.set(term, { term, desc: k.desc, refs: [] }); gl.get(term).refs.push(ref); }
  for (const u of n.units || []) { if (!un.has(u)) un.set(u, { name: u, items: [] }); un.get(u).items.push(ref); }
});
const entries = [...gl.values()].sort((x, y) => x.term.localeCompare(y.term, 'ja'));
fs.writeFileSync(path.join(OUT, 'glossary.html'), glossaryPage({ cfg, css, entries, recent: desc }));
const units = [...un.values()].sort((x, y) => x.name.localeCompare(y.name, 'ja'));
fs.writeFileSync(path.join(OUT, 'units.html'), unitsPage({ cfg, css, units, recent: desc }));

// 時事まとめ（ハブ・月ごと・年間・ランキング・週ごと）
fs.mkdirSync(path.join(OUT, 'matome'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'weekly'), { recursive: true });
const monthInfo = months.map((ym) => ({ ym, items: flat.filter((x) => x.date.startsWith(ym)) }));
monthInfo.forEach((m, k) => fs.writeFileSync(path.join(OUT, 'matome', `${m.ym}.html`), monthPage({ cfg, css, ym: m.ym, items: m.items, prev: months[k - 1], next: months[k + 1], year, recent: desc })));
const weekInfo = weeks.map((mon) => weekData(mon, all));
weekInfo.forEach((w, k) => {
  fs.writeFileSync(path.join(OUT, 'weekly', `${w.mon}.html`), weeklyPage({ cfg, css, w, prev: weeks[k - 1], next: weeks[k + 1], recent: desc }));
  fs.writeFileSync(path.join(OUT, 'weekly', `${w.mon}-print.html`), printHtml(cfg, w));
});
fs.writeFileSync(path.join(OUT, 'weekly', 'weeks.json'), JSON.stringify(weekInfo.map((w) => ({ mon: w.mon, end: addDays(w.mon, 6), count: w.items.length, main: w.main.map((x) => ({ key: x.key, title: plain(x.n.short_title || x.n.title) })) }))));
if (year) {
  fs.writeFileSync(path.join(OUT, 'matome', `${year.exam_year}.html`), yearPage({ cfg, css, year, newsByKey, recent: desc }));
  fs.writeFileSync(path.join(OUT, 'matome', `${year.exam_year}-ranking.html`), rankingPage({ cfg, css, year, recent: desc }));
}
fs.writeFileSync(path.join(OUT, 'matome', 'index.html'), hubPage({ cfg, css, months: [...monthInfo].reverse().map((m) => ({ ym: m.ym, count: m.items.length })), weeks: [...weekInfo].reverse().map((w) => ({ mon: w.mon, count: w.items.length })), year, recent: desc }));

// トップは最新号をそのまま見せる
if (desc[0]) {
  const html = articlePage({ cfg, css, a: desc[0], prev: desc[1]?.date, next: null, top: true, recent: desc.slice(1) });
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
}
fs.writeFileSync(path.join(OUT, 'archive.html'), listPage({
  cfg, css, items: desc, path: '/archive.html', recent: desc,
  title: `バックナンバー｜${cfg.siteName}`, heading: 'バックナンバー', lead: 'これまでのニュースの一覧です。入試前の時事のふり返りにどうぞ。',
}));
for (const [key, name] of [['rika', '理科'], ['shakai', '社会']]) {
  const items = desc.filter((a) => a.news.some((n) => n.subject_key === key));
  fs.writeFileSync(path.join(OUT, 'subject', `${key}.html`), listPage({
    cfg, css, items, path: `/subject/${key}.html`, recent: desc, filter: (n) => n.subject_key === key,
    title: `${name}のニュース｜${cfg.siteName}`, heading: `${name}のニュース`, lead: `${name}につながるニュースだけを集めました。`,
  }));
}

// 固定ページ（広告審査にも必要）
const MAIL = cfg.contactEmail || '';
const mailLink = MAIL ? `<a href="mailto:${esc(MAIL)}">${esc(MAIL)}</a>` : '（お問い合わせ先を記入）';
const statics = [
  ['about', 'このサイトについて', `<p>${esc(cfg.siteName)}は、中学受験をめざす小学生と保護者のための時事ニュースサイトです。毎日3本のニュースを、ふりがな・図解・クイズつきで紹介しています。</p>`
    + `<h3>記事のつくり方</h3><p>記事は、AI（Claude）が新聞社やテレビ局、公的機関などの報道をもとに下書きします。そのあと別のAIが、数字・日付・人名などを出典と照らし合わせて確認し、まちがいを直してから公開しています。公開後も運営者が記事を読み、気になる点があれば直しています。各記事の下に、参考にした出典をのせています。</p>`
    + `<h3>訂正の方針</h3><p>記事にまちがいが見つかった場合は、すみやかに本文を直し、記事の中に「訂正（日付）」として何をどう直したかを示します。まちがいに気づいたら、お問い合わせから教えてください。</p>`
    + `<h3>運営者</h3><p>運営：${esc(cfg.operator || 'じじたね編集部')}<br>お問い合わせ：${mailLink}</p>`],
  ['privacy', 'プライバシーポリシー', `<h3>アクセス解析について</h3><p>当サイトでは、サイトの改善のために Cloudflare Web Analytics を使って、ページの閲覧数などを集計しています。Cookie は使わず、個人を特定する情報は集めていません。</p>`
    + `<h3>広告について</h3><p>当サイトでは、今後、第三者配信の広告サービス（Google アドセンス）を利用する予定です。利用を始めた場合、広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。Cookie を使った広告の表示は、<a href="https://adssettings.google.com/" rel="noopener">Google の広告設定</a>で無効にできます。</p>`
    + `<h3>お問い合わせでいただいた情報について</h3><p>お問い合わせでいただいたお名前やメールアドレスは、お返事のためだけに使い、ほかの目的には使いません。</p>`
    + `<h3>免責事項</h3><p>記事の内容には正確さを期していますが、ニュースの性質上、その後の発表で状況が変わることがあります。最新の情報は、各記事の出典などで確かめてください。</p>`
    + `<p>制定：2026年10月26日</p>`],
  ['contact', 'お問い合わせ', `<p>記事のまちがいのご指摘、ご意見・ご感想、塾・学校での利用や広告掲載のご相談は、下記のメールアドレスまでお送りください。</p><p style="font-size:1.15em"><b>${mailLink}</b></p><p>記事のまちがいについては、記事の日付と何本目のニュースかを書いていただけると助かります。お返事までに数日いただくことがあります。</p>`],
];
for (const [slug, title, html] of statics) fs.writeFileSync(path.join(OUT, `${slug}.html`), staticPage({ cfg, css, title, html, path: `/${slug}.html`, recent: desc }));

// RSS・サイトマップ・robots
const base = cfg.siteUrl.replace(/\/$/, '');
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(cfg.siteName)}</title><link>${base}/</link><description>${esc(cfg.tagline)}</description><language>ja</language>
${desc.slice(0, 30).map((a) => `<item><title>${esc(jpDate(a.date).short + ' ' + a.news.map((n) => plain(n.short_title || n.title)).join('／'))}</title><link>${base}/news/${a.date}.html</link><guid>${base}/news/${a.date}.html</guid><pubDate>${new Date(a.date + 'T07:00:00+09:00').toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>`;
fs.writeFileSync(path.join(OUT, 'feed.xml'), rss);
const urls = ['/', '/matome/', ...(year ? [`/matome/${year.exam_year}.html`, `/matome/${year.exam_year}-ranking.html`] : []), ...months.map((m) => `/matome/${m}.html`), ...weeks.map((w) => `/weekly/${w}.html`), '/archive.html', '/glossary.html', '/units.html', '/subject/rika.html', '/subject/shakai.html', ...all.flatMap((a) => [`/news/${a.date}.html`, ...a.news.map((_, j) => `/news/${a.date}-${j + 1}.html`)])];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`${all.length} 号分を dist/ に書き出しました`);
