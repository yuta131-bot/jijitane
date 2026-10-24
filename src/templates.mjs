import fs from 'node:fs';
import { esc, inline, plain, safeSvg, jpDate } from './markup.mjs';

const TOOLS = `<div class="hero-tools"><button type="button" class="ruby-toggle" aria-pressed="true">ふりがな：あり</button><span class="streak" hidden></span></div>`;

const SUBJ = { rika: ['理科', 'var(--sci)', 't-sci'], shakai: ['社会', 'var(--soc)', 't-soc'], other: ['その他', 'var(--sky)', 't-sky'] };
const subj = (k) => SUBJ[k] || SUBJ.other;
// 図の形：スマホ向けのたて長（viewBox の幅 400 以下）か、以前の横長か
const figClass = (svg) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(svg); return m && +m[1] <= 400 ? 'fig-tall' : 'fig-wide'; };
const baseOf = (cfg) => cfg.siteUrl.replace(/\/$/, '');

const CLIENT_JS = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8').replace(/<\/script/gi, '<\\/script');

export const slug = (s) => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0; return 'k' + h.toString(36); };

const LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="11" fill="#1D2B44"/><path d="M20 30 V19" stroke="#9FE1CB" stroke-width="3" stroke-linecap="round"/><ellipse cx="15" cy="17" rx="5" ry="3" fill="#9FE1CB"/><ellipse cx="25" cy="15" rx="5" ry="3" fill="#9FE1CB"/><circle cx="20" cy="31" r="3" fill="#FFE36E"/></svg>`;

const MASCOT = `<svg class="mascot" viewBox="0 0 120 120" aria-hidden="true"><path d="M38 34 q-4 -16 8 -20 q4 10 4 18" fill="#E9D8F2" stroke="#7A6458" stroke-width="2.4" stroke-linejoin="round"/><path d="M82 34 q4 -16 -8 -20 q-4 10 -4 18" fill="#E9D8F2" stroke="#7A6458" stroke-width="2.4" stroke-linejoin="round"/><path d="M60 22 C100 22 112 52 112 80 C112 108 92 116 60 116 C28 116 8 108 8 80 C8 52 20 22 60 22 Z" fill="#E9D8F2" stroke="#7A6458" stroke-width="2.4"/><path d="M60 66 C84 66 92 82 92 96 C92 110 78 114 60 114 C42 114 28 110 28 96 C28 82 36 66 60 66 Z" fill="#FFF3DD"/><circle cx="41" cy="56" r="11" fill="#fff" stroke="#7A6458" stroke-width="2.2"/><circle cx="79" cy="56" r="11" fill="#fff" stroke="#7A6458" stroke-width="2.2"/><path d="M52 55 q8 -3 16 0" fill="none" stroke="#7A6458" stroke-width="2.2" stroke-linecap="round"/><circle cx="41" cy="57" r="3.2" fill="#4A3B33"/><circle cx="79" cy="57" r="3.2" fill="#4A3B33"/><path d="M32 40 q9 -5 17 0 M71 40 q8 -5 17 0" fill="none" stroke="#B8A7A0" stroke-width="3.5" stroke-linecap="round"/><path d="M56 66 q4 6 8 0 Z" fill="#F7C089" stroke="#7A6458" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="28" cy="72" rx="7" ry="4" fill="#FFC7D1"/><ellipse cx="92" cy="72" rx="7" ry="4" fill="#FFC7D1"/><rect x="44" y="86" width="32" height="24" rx="3" fill="#fff" stroke="#7A6458" stroke-width="2"/><path d="M50 94 h20 M50 101 h13" stroke="#B9D7F0" stroke-width="3" stroke-linecap="round"/></svg>`;

// 広告枠。site.config.json の ads.client（AdSense の ca-pub-...）が入っていれば本物の広告、なければ枠だけ表示
function ad(cfg, slot, size = 'wide') {
  const a = cfg.ads || {};
  if (!a.enabled) return '';
  if (a.client && a.slots?.[slot]) {
    return `<div class="ad ad-${size}"><span class="ad-label">広告</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(a.client)}" data-ad-slot="${esc(a.slots[slot])}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
  }
  return `<div class="ad ad-${size} ad-ph"><span class="ad-label">広告</span><span class="ad-box">広告スペース（${slot}）</span></div>`;
}

function stars(n) {
  const v = Math.max(0, Math.min(3, Number(n) || 0));
  if (!v) return '';
  return `<span class="exam" title="入試に出るかも度">入試に出るかも <b>${'★'.repeat(v)}</b><i>${'★'.repeat(3 - v)}</i></span>`;
}

function issueItem(base, a, ns) {
  return `<li><a href="${base}/news/${a.date}.html"><span class="d">${jpDate(a.date).label}</span><span class="mini">${ns.map((n) => { const s = subj(n.subject_key); return `<span class="row"><span class="chip" style="--c:${s[1]}">${s[0]}</span>${esc(plain(n.short_title || n.title))}</span>`; }).join('')}</span></a></li>`;
}

function sidebar(cfg, recent) {
  const base = baseOf(cfg);
  const xUrl = cfg.xHandle ? `https://x.com/${cfg.xHandle}` : 'https://x.com/';
  return `<aside class="side">
  <section class="box follow-box"><b>毎朝7時に配信中</b><p>その日の3本とクイズが届きます。</p>
    <a class="btn" href="${esc(xUrl)}" target="_blank" rel="noopener">Xでフォロー</a>
    ${cfg.lineUrl ? `<a class="btn btn-line" href="${esc(cfg.lineUrl)}" target="_blank" rel="noopener">LINEで受け取る</a>` : ''}</section>
  ${ad(cfg, 'side', 'rect')}
  <section class="box"><h4>教科でさがす</h4><div class="subj-links"><a href="${base}/subject/rika.html" style="--c:var(--sci)">理科</a><a href="${base}/subject/shakai.html" style="--c:var(--soc)">社会</a><a href="${base}/archive.html" style="--c:var(--ink)">すべて</a></div></section>
  ${recent.length ? `<section class="box"><h4>最近の号</h4><ul class="side-list">${recent.slice(0, 5).map((r) => `<li><a href="${base}/news/${r.date}.html"><span>${jpDate(r.date).short}</span>${esc(plain(r.news[0].short_title || r.news[0].title))} ほか</a></li>`).join('')}</ul></section>` : ''}
</aside>`;
}

export function layout({ cfg, title, desc, path, ogImage, main, css, recent = [] }) {
  const base = baseOf(cfg);
  const url = base + path;
  const img = ogImage ? base + ogImage : '';
  const adsHead = cfg.ads?.enabled && cfg.ads?.client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.ads.client)}" crossorigin="anonymous"></script>` : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${img ? `<meta property="og:image" content="${esc(img)}">\n<meta name="twitter:image" content="${esc(img)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.siteName)}" href="${base}/feed.xml">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO.replace('class="logo" ', 'xmlns="http://www.w3.org/2000/svg" '))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
${adsHead}
${cfg.analytics?.plausible ? `<script defer data-domain="${esc(cfg.analytics.plausible)}" src="https://plausible.io/js/script.js"></script>` : ''}
<style>${css}</style>
</head>
<body>
<header class="gh"><div class="gh-in">
  <a class="brand" href="${base}/">${LOGO}<span><b>${cfg.brandPrefix ? `<i class="bp">${esc(cfg.brandPrefix)}</i>${esc(cfg.brandMain)}` : esc(cfg.siteName)}</b><small>${esc(cfg.taglineShort || cfg.tagline)}</small></span></a>
  ${MASCOT}
  <nav class="gnav"><a href="${base}/subject/rika.html">理科</a><a href="${base}/subject/shakai.html">社会</a><a href="${base}/archive.html">バックナンバー</a></nav>
</div></header>
<div class="page">
<main>
${main}
${ad(cfg, 'bottom')}
</main>
${sidebar(cfg, recent)}
</div>
<footer class="gf"><div class="gf-in">
  <div><b>${esc(cfg.siteName)}</b><br>${esc(cfg.tagline)}</div>
  <nav><a href="${base}/glossary.html">用語集</a><a href="${base}/units.html">単元別</a><a href="${base}/about.html">このサイトについて・訂正の方針</a><a href="${base}/privacy.html">プライバシーポリシー</a><a href="${base}/contact.html">お問い合わせ</a></nav>
  <p>記事はAIが下書きし、別のAIによる事実確認と人の確認をへて公開しています。まちがいが見つかった場合は、記事の中に訂正内容と日付を示して直します。</p>
</div></footer>
<script>${CLIENT_JS}</script>
</body>
</html>`;
}

function newsBlock(n, i, a, base, single = false) {
  const svg = safeSvg(n.svg, `n${i}`);
  const s = subj(n.subject_key);
  return `<article id="news${i + 1}" style="--c:${s[1]}">
  <div class="art-head"><span class="tag ${s[2]}">${inline(n.subject)}</span>${stars(n.exam_level)}</div>
  <h2><span class="num">${i + 1}</span><span>${inline(n.title)}</span></h2>
  ${(n.units || []).length ? `<div class="units">${n.units.map((u) => `<a class="unit" href="${base}/units.html#${slug(u)}">${esc(u)}</a>`).join('')}</div>` : ''}
  <div class="art-tools"><button type="button" class="speak" data-target="${single ? 'single' : `news${i + 1}`}"><span aria-hidden="true">🔊</span> よみあげ</button>${single ? '' : `<a class="permalink" href="${base}/news/${a.date}-${i + 1}.html">この記事だけのページ →</a>`}</div>
  <div class="three"><b>3行でいうと</b><ul>${n.points.map((p) => `<li>${inline(p)}</li>`).join('')}</ul></div>
  ${svg ? `<figure class="fig ${figClass(svg)}"><button type="button" class="fig-zoom" aria-label="図を大きく見る">${svg}<span class="zoom-hint" aria-hidden="true">🔍 大きく見る</span></button><figcaption class="cap">${inline(n.caption || '')}</figcaption></figure>` : ''}
  ${n.body.map((p) => `<p>${inline(p)}</p>`).join('\n  ')}
  <h3>おぼえておきたい<ruby>言葉<rt>ことば</rt></ruby></h3>
  <ul class="kw">${(n.keywords || []).map((k) => `<li><a href="${base}/glossary.html#${slug(plain(k.term))}"><b>${inline(k.term)}</b></a>：${inline(k.desc)}</li>`).join('')}</ul>
  ${Array.isArray(n.quiz.choices) && n.quiz.choices.length >= 2 ? `<div class="quiz mc" data-qid="${a.date}-${i + 1}" data-answer="${Number(n.quiz.answer) || 0}"><div class="qhead"><span class="qmark">Q</span><span>${inline(n.quiz.q)}</span></div><div class="choices">${n.quiz.choices.map((c, j) => `<button type="button" class="choice" data-i="${j}"><span class="cl">${'ABCD'[j]}</span><span>${inline(c)}</span></button>`).join('')}</div><div class="ans" hidden><b class="verdict"></b> ${inline(n.quiz.a)}${n.quiz.hint ? `<br><span class="hint">${inline(n.quiz.hint)}</span>` : ''}</div></div>` : `<details class="quiz"><summary><span class="qmark">Q</span><span>${inline(n.quiz.q)}</span><span class="open">答えを見る</span></summary><div class="ans"><b>A.</b> ${inline(n.quiz.a)}${n.quiz.hint ? `<br><span class="hint">${inline(n.quiz.hint)}</span>` : ''}</div></details>`}
  ${(n.corrections || []).map((c) => `<div class="fix"><b>訂正（${esc(c.date)}）</b>${inline(c.text)}</div>`).join('')}
  ${(n.talk_hints || []).length ? `<details class="talkbox tdet"><summary><span class="tmark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-8l-5 4v-4H5a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z" fill="#fff"/><path d="M25 12h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v3l-4-3h-5" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="8" cy="13.5" r="1.4" fill="#E86A92"/><circle cx="12.5" cy="13.5" r="1.4" fill="#E86A92"/><circle cx="17" cy="13.5" r="1.4" fill="#E86A92"/></svg></span><span class="tbody"><span class="tlabel">おうちの人と話そう</span><span class="ttext">${inline(n.talk)}</span></span><span class="open">ヒントを見る</span></summary><div class="tans"><b>こんな考え方があるよ</b><ul>${n.talk_hints.map((h) => `<li>${inline(h)}</li>`).join('')}</ul><span class="thint">正解はないよ。自分はどう思うか、話してみよう</span></div></details>` : `<div class="talkbox"><span class="tmark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-8l-5 4v-4H5a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z" fill="#fff"/><path d="M25 12h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v3l-4-3h-5" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="8" cy="13.5" r="1.4" fill="#E86A92"/><circle cx="12.5" cy="13.5" r="1.4" fill="#E86A92"/><circle cx="17" cy="13.5" r="1.4" fill="#E86A92"/></svg></span><div class="tbody"><span class="tlabel">おうちの人と話そう</span><span class="ttext">${inline(n.talk)}</span><span class="thint">正解はないよ。思ったことを話してみよう</span></div></div>`}
</article>`;
}

export function articlePage({ cfg, a, prev, next, css, top = false, recent = [] }) {
  const dt = jpDate(a.date);
  const base = baseOf(cfg);
  const pageUrl = `${base}/news/${a.date}.html`;
  const shareText = `${dt.short}の${cfg.siteName}\n` + a.news.map((n, i) => `${'①②③'[i]}${plain(n.short_title || n.title)}`).join('\n');
  const xShare = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}&hashtags=${encodeURIComponent(cfg.hashtags.join(','))}`;
  const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl)}`;
  const sources = (a.sources || []).filter((s) => /^https?:\/\//.test(s.url));
  const toc = `<ol class="toc">${a.news.map((n, i) => {
    const s = subj(n.subject_key);
    const th = safeSvg(n.svg, `t${i}`);
    return `<li><a href="#news${i + 1}" style="--c:${s[1]}"><span class="thumb">${th}</span><span class="tx"><span class="sj"><span class="no">${i + 1}</span>${esc(plain(n.subject))}</span><span class="tt">${inline(n.title)}</span></span></a></li>`;
  }).join('')}</ol>`;
  const articles = a.news.map((n, i) => newsBlock(n, i, a, base) + (i < 2 ? ad(cfg, `in-article-${i + 1}`) : '')).join('\n');
  const main = `<section class="hero">
  <div class="hero-date"><span class="hd-md">${dt.m}<small>月</small>${dt.d}<small>日</small></span><span class="hd-wd">${dt.wd}</span></div>
  <div class="hero-tx"><p class="issue">${top ? 'きょうの号' : `${dt.y}年の号`}<span class="badge">3分で読める</span></p><p class="lead">${inline(a.intro || '')}</p>${TOOLS}</div>
</section>
${toc}
${articles}
${(a.briefs || []).length ? `<section class="briefs"><h3>ひとことニュース</h3><ul>${a.briefs.map((b) => `<li>${inline(b)}</li>`).join('')}</ul></section>` : ''}
${a.extra ? `<div class="tonight">${inline(a.extra)}</div>` : ''}
<div class="share"><span>この号をシェア</span><a href="${esc(xShare)}" target="_blank" rel="noopener">X</a><a href="${esc(lineShare)}" target="_blank" rel="noopener">LINE</a></div>
<nav class="pager">${prev ? `<a class="prev" href="${base}/news/${prev}.html"><small>前の号</small>${jpDate(prev).short}</a>` : '<span></span>'}${next ? `<a class="next" href="${base}/news/${next}.html"><small>次の号</small>${jpDate(next).short}</a>` : '<span></span>'}</nav>
${top ? `<section class="about"><h3>保護者の方へ</h3><p>入試の時事問題は、前年の秋ごろまでのニュースからよく出題されます。このサイトでは毎日3本を、小学5年生が一人で読める言葉・ふりがな・図解・入試を意識したクイズで紹介しています。記事はAIが下書きし、人が事実と表現を確認してから公開しています。</p></section>` : ''}
${sources.length ? `<div class="sources"><b>参考にした報道</b><ul>${sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul></div>` : ''}`;
  return layout({
    cfg, css, main, recent,
    title: `${dt.short} ${a.news.map((n) => plain(n.short_title || n.title)).join('／')}｜${cfg.siteName}`,
    desc: `${dt.label}の時事ニュース3本を小学生向けにやさしく図解。` + a.news.map((n) => plain(n.title)).join('、'),
    path: top ? '/' : `/news/${a.date}.html`,
    ogImage: `/og/${a.date}.png`,
  });
}

export function listPage({ cfg, css, title, heading, lead, items, path, filter, recent = [] }) {
  const base = baseOf(cfg);
  const groups = {};
  for (const a of items) (groups[a.date.slice(0, 7)] ||= []).push(a);
  const main = `<section class="hero hero-list"><div class="hero-tx"><h1>${esc(heading)}</h1><p class="lead">${esc(lead)}</p></div></section>
${Object.entries(groups).map(([ym, as]) => `<h3 class="month">${Number(ym.slice(0, 4))}年${Number(ym.slice(5))}月</h3><ul class="list">${as.map((a) => issueItem(base, a, filter ? a.news.filter(filter) : a.news)).join('')}</ul>`).join('')}`;
  return layout({ cfg, css, main, recent, title, desc: lead, path, ogImage: items[0] ? `/og/${items[0].date}.png` : '' });
}

export function staticPage({ cfg, css, title, html, path, recent = [] }) {
  return layout({ cfg, css, recent, title: `${title}｜${cfg.siteName}`, desc: title, path, main: `<section class="hero hero-list"><div class="hero-tx"><h1>${esc(title)}</h1></div></section><div class="prose">${html}</div>` });
}

export function newsPage({ cfg, css, a, i, recent = [] }) {
  const n = a.news[i];
  const dt = jpDate(a.date);
  const base = baseOf(cfg);
  const pageUrl = `${base}/news/${a.date}-${i + 1}.html`;
  const xShare = `https://x.com/intent/post?text=${encodeURIComponent(plain(n.title) + '｜' + cfg.siteName)}&url=${encodeURIComponent(pageUrl)}&hashtags=${encodeURIComponent(cfg.hashtags.join(','))}`;
  const others = a.news.map((m, j) => ({ m, j })).filter((x) => x.j !== i);
  const sources = (a.sources || []).filter((s) => /^https?:\/\//.test(s.url));
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/news/${a.date}.html">${dt.label}の号</a><span>›</span><span>${i + 1}本目</span></nav>
<section class="hero hero-list"><div class="hero-tx"><p class="issue">${dt.label}<span class="badge">1分で読める</span></p>${TOOLS}</div></section>
${newsBlock(n, i, a, base, true).replace('<article ', '<article data-single="1" ')}
${ad(cfg, 'in-article-1')}
<div class="share"><span>この記事をシェア</span><a href="${esc(xShare)}" target="_blank" rel="noopener">X</a></div>
<section class="siblings"><h3>この日のほかのニュース</h3><ul class="list">${others.map(({ m, j }) => { const s = subj(m.subject_key); return `<li><a href="${base}/news/${a.date}-${j + 1}.html"><span class="d">${dt.label}・${j + 1}本目</span><span class="mini"><span class="row"><span class="chip" style="--c:${s[1]}">${s[0]}</span>${esc(plain(m.short_title || m.title))}</span></span></a></li>`; }).join('')}</ul></section>
${sources.length ? `<div class="sources"><b>参考にした報道</b><ul>${sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul></div>` : ''}`;
  return layout({
    cfg, css, main, recent,
    title: `${plain(n.title)}｜小学生にもわかる図解｜${cfg.siteName}`,
    desc: n.points.map(plain).join(' '),
    path: `/news/${a.date}-${i + 1}.html`,
    ogImage: `/og/${a.date}.png`,
  });
}

export function glossaryPage({ cfg, css, entries, recent = [] }) {
  const base = baseOf(cfg);
  const main = `<section class="hero hero-list"><div class="hero-tx"><h1>じじ用語集</h1><p class="lead">記事に出てきた「おぼえておきたい言葉」を集めました。${entries.length}語</p>${TOOLS}</div></section>
<ul class="gloss">${entries.map((e) => `<li id="${slug(e.term)}"><b>${esc(e.term)}</b><p>${inline(e.desc)}</p><span class="gsrc">${e.refs.map((r) => `<a href="${base}/news/${r.date}-${r.i + 1}.html">${esc(jpDate(r.date).short)}「${esc(r.title)}」</a>`).join('')}</span></li>`).join('')}</ul>`;
  return layout({ cfg, css, main, recent, title: `用語集｜${cfg.siteName}`, desc: '中学受験の時事問題に出てくる言葉を、小学生向けにやさしく解説した用語集です。', path: '/glossary.html' });
}

export function unitsPage({ cfg, css, units, recent = [] }) {
  const base = baseOf(cfg);
  const main = `<section class="hero hero-list"><div class="hero-tx"><h1>単元別に見る</h1><p class="lead">教科書や塾の単元ごとに、関係するニュースをまとめました。</p></div></section>
${units.map((u) => `<section class="unit-sec" id="${slug(u.name)}"><h3 class="month">${esc(u.name)}<small>${u.items.length}本</small></h3><ul class="list">${u.items.map((r) => `<li><a href="${base}/news/${r.date}-${r.i + 1}.html"><span class="d">${jpDate(r.date).label}</span><span class="mini"><span class="row">${esc(r.title)}</span></span></a></li>`).join('')}</ul></section>`).join('')}`;
  return layout({ cfg, css, main, recent, title: `単元別｜${cfg.siteName}`, desc: '中学受験の理科・社会の単元ごとに時事ニュースをまとめました。', path: '/units.html' });
}
