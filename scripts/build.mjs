// content/*.json からサイト（dist/）を作る
import fs from 'node:fs';
import path from 'node:path';
import { articlePage, listPage, staticPage, newsPage, glossaryPage, unitsPage } from '../src/templates.mjs';
import { renderCard } from '../src/card.mjs';
import { esc, plain, jpDate, setSayKeys } from '../src/markup.mjs';
import { sayKeys } from '../src/readings.mjs';
import { validate } from '../src/schema.mjs';

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
const statics = [
  ['about', 'このサイトについて', `<p>${esc(cfg.siteName)}は、中学受験をめざす小学生と保護者のための時事ニュースサイトです。毎日3本のニュースを、ふりがな・図解・クイズつきで紹介しています。</p><p>記事はAI（Claude）が報道をもとに下書きし、別のAIが出典と照らし合わせて事実を確認したうえで、運営者が表現も含めて確認してから公開しています。</p><h3>訂正の方針</h3><p>記事にまちがいが見つかった場合は、すみやかに本文を直し、記事の中に「訂正（日付）」として何をどう直したかを示します。まちがいに気づいたら、お問い合わせから教えてください。</p><p>運営者：（運営者名を記入）</p>`],
  ['privacy', 'プライバシーポリシー', `<p>当サイトでは、第三者配信の広告サービス（Google アドセンス）を利用する予定です。広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。</p><p>当サイトはアクセス解析ツールを利用する場合があります。収集されるデータは匿名で、個人を特定するものではありません。</p><p>（公開前に、実際に使うサービスに合わせて内容を確定してください）</p>`],
  ['contact', 'お問い合わせ', `<p>記事のまちがい・ご意見・広告掲載のご相談は、下記までお送りください。</p><p>（お問い合わせフォームまたはメールアドレスを記入）</p>`],
];
for (const [slug, title, html] of statics) fs.writeFileSync(path.join(OUT, `${slug}.html`), staticPage({ cfg, css, title, html, path: `/${slug}.html`, recent: desc }));

// RSS・サイトマップ・robots
const base = cfg.siteUrl.replace(/\/$/, '');
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(cfg.siteName)}</title><link>${base}/</link><description>${esc(cfg.tagline)}</description><language>ja</language>
${desc.slice(0, 30).map((a) => `<item><title>${esc(jpDate(a.date).short + ' ' + a.news.map((n) => plain(n.short_title || n.title)).join('／'))}</title><link>${base}/news/${a.date}.html</link><guid>${base}/news/${a.date}.html</guid><pubDate>${new Date(a.date + 'T07:00:00+09:00').toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>`;
fs.writeFileSync(path.join(OUT, 'feed.xml'), rss);
const urls = ['/', '/archive.html', '/glossary.html', '/units.html', '/subject/rika.html', '/subject/shakai.html', ...all.flatMap((a) => [`/news/${a.date}.html`, ...a.news.map((_, j) => `/news/${a.date}-${j + 1}.html`)])];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`${all.length} 号分を dist/ に書き出しました`);
