// 「深掘り」：ニュースの中から1つを選び、「なぜ？」を掘り下げて読ませる特集（週2本ほど）
// content/fukabori/*.json から /fukabori/<id>.html と /fukabori/（一覧）を作る。
import fs from 'node:fs';
import { esc, inline, plain, safeSvg, jpDate } from './markup.mjs';
import { layout } from './templates.mjs';

const baseOf = (cfg) => cfg.siteUrl.replace(/\/$/, '');
const TOOLS = `<div class="hero-tools"><button type="button" class="ruby-toggle" aria-pressed="true">ふりがな：あり</button><span class="streak" hidden></span></div>`;

export function loadFukabori(dir = 'content/fukabori') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')))
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
}

export function validateFukabori(f) {
  const e = [];
  if (!/^[a-z0-9-]+$/.test(f?.id || '')) e.push('id は半角英小文字・数字・ハイフン');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f?.date || '')) e.push('date が YYYY-MM-DD ではありません');
  for (const k of ['title', 'short_title', 'lead', 'subject']) if (typeof f?.[k] !== 'string' || !f[k].trim()) e.push(`${k} がありません`);
  if (!f?.from?.date || !Number.isInteger(f.from.n)) e.push('from（元のニュースの date と n）がありません');
  if (!Array.isArray(f?.sections) || f.sections.length < 3) e.push('sections は3つ以上');
  (f?.sections || []).forEach((s, i) => {
    if (!s.h || !Array.isArray(s.p) || !s.p.length) e.push(`sections[${i}] に h と p が必要です`);
    if (s.svg !== undefined && (!/^\s*<svg[\s>]/i.test(s.svg) || !/<\/svg>\s*$/i.test(s.svg) || /<script/i.test(s.svg))) e.push(`sections[${i}].svg が正しい SVG ではありません`);
  });
  if (!Array.isArray(f?.point) || f.point.length < 2) e.push('point（入試に出るポイント）は2つ以上');
  const q = f?.quiz;
  if (!q?.q || !q?.a || !Array.isArray(q.choices) || q.choices.length < 2 || !Number.isInteger(q.answer) || q.answer >= q.choices.length) e.push('quiz（q / a / choices / answer）が正しくありません');
  if (!Array.isArray(f?.sources) || !f.sources.length) e.push('sources がありません');
  if ((JSON.stringify(f).match(/\{[^{}|"]*$/g) || []).length) e.push('ふりがな記法が閉じていない可能性があります');
  return e;
}


const figHtml = (svg, cap, prefix) => {
  const s = safeSvg(svg, prefix);
  const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(s);
  const cls = m && +m[1] <= 400 ? 'fig-tall' : 'fig-wide';
  return `<figure class="fig ${cls}"><button type="button" class="fig-zoom" aria-label="図を大きく見る">${s}<span class="zoom-hint" aria-hidden="true">大きく見る</span></button>${cap ? `<figcaption class="cap">${inline(cap)}</figcaption>` : ''}</figure>`;
};

export function fukaboriPage({ cfg, css, f, recent }) {
  const base = baseOf(cfg);
  const dt = jpDate(f.date);
  const from = f.from;
  const fromUrl = `${base}/news/${from.date}-${from.n}.html`;
  const q = f.quiz;
  const sources = (f.sources || []).filter((s) => /^https?:\/\//.test(s.url));
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/fukabori/">深掘り</a><span>›</span><span>${esc(plain(f.short_title))}</span></nav>
<section class="hero hero-list"><div class="hero-tx"><span class="fk-badge">深掘り</span><h1>${inline(f.title)}</h1><p class="lead">${inline(f.lead)}</p>${TOOLS}<p class="mt-upd">${esc(dt.label)}</p></div></section>
<article class="fk" style="--c:var(--sci)">
<a class="fk-from" href="${fromUrl}"><small>もとになったニュース（${esc(jpDate(from.date).label)}）</small><b>${inline(f.from.title || '')}</b></a>
${f.sections.map((s, i) => `<section><h2 class="fk-h">${inline(s.h)}</h2>${s.svg ? figHtml(s.svg, s.caption, `k${i}`) : ''}${s.p.map((p) => `<p>${inline(p)}</p>`).join('')}</section>`).join('\n')}
<div class="fk-point"><b>入試に出るポイント</b><ul>${f.point.map((p) => `<li>${inline(p)}</li>`).join('')}</ul></div>
${(f.keywords || []).length ? `<h3>おぼえておきたい<ruby>言葉<rt>ことば</rt></ruby></h3><ul class="kw">${f.keywords.map((k) => `<li><b>${inline(k.term)}</b>：${inline(k.desc)}</li>`).join('')}</ul>` : ''}
<div class="quiz mc" data-qid="fk-${esc(f.id)}" data-answer="${q.answer}"><div class="qhead"><span class="qmark">Q</span><span>${inline(q.q)}</span></div><div class="choices">${q.choices.map((c, j) => `<button type="button" class="choice" data-i="${j}"><span class="cl">${'ABCD'[j]}</span><span>${inline(c)}</span></button>`).join('')}</div><div class="ans" hidden><b class="verdict"></b> ${inline(q.a)}${q.hint ? `<br><span class="hint">${inline(q.hint)}</span>` : ''}</div></div>
</article>
${sources.length ? `<div class="sources"><b>参考にした資料</b><ul>${sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul></div>` : ''}
<nav class="pager"><a class="prev" href="${base}/fukabori/"><small>ほかの記事</small>深掘り一覧</a><span></span></nav>`;
  return layout({
    cfg, css, main, recent,
    title: `${plain(f.title)}｜深掘り｜${cfg.siteName}`,
    desc: plain(f.lead).slice(0, 120), path: `/fukabori/${f.id}.html`, ogImage: '/og/site.png',
    ld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: plain(f.title).slice(0, 110), description: plain(f.lead).slice(0, 200), inLanguage: 'ja', datePublished: `${f.date}T07:00:00+09:00`, author: { '@type': 'Organization', name: cfg.operator || cfg.siteName }, publisher: { '@type': 'Organization', name: cfg.siteName, url: base + '/' } }],
  });
}

export function fukaboriIndexPage({ cfg, css, items, recent }) {
  const base = baseOf(cfg);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><span>深掘り</span></nav>
<section class="hero hero-list"><div class="hero-tx"><span class="fk-badge">深掘り</span><h1>ニュースの深掘り</h1><p class="lead">ニュースの中から1つを選んで、「なぜ？」「どうして？」をじっくり読める形にしました。入試に出るポイントとクイズつきです。</p></div></section>
<div class="mt-cards">${items.map((f) => `<a class="mt-card" href="${base}/fukabori/${f.id}.html"><span class="sx-cb"><b>${inline(f.title)}</b><small>${esc(jpDate(f.date).label)}・${esc(plain(f.subject))}</small></span></a>`).join('')}</div>`;
  return layout({ cfg, css, main, recent, title: `ニュースの深掘り｜${cfg.siteName}`, desc: 'ニュースの中から1つを選び、なぜ？を掘り下げて読む、中学受験生向けの特集。', path: '/fukabori/', ogImage: '/og/site.png' });
}
