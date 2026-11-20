// 「中受の読み物」：シート（ぱっと見る1枚）では書ききれない、おぼえ方や考え方の解説ページ。
// content/study/*.json から /study/<id>.html と /study/（一覧）を作る。印刷用のシートとは別の資料。
import fs from 'node:fs';
import { esc, jpDate } from './markup.mjs';
import { layout } from './templates.mjs';

const baseOf = (cfg) => cfg.siteUrl.replace(/\/$/, '');

export function loadStudy(dir = 'content/study') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
}

const STUDY_CSS = `
.wx{margin:0 0 18px}.wx h2{font-size:20px;font-weight:900;margin:22px 0 8px;padding-left:10px;border-left:6px solid #1E9A72}.wx p{line-height:1.9;margin:8px 0}.wx ul{margin:8px 0 8px 1.2em;line-height:1.9}.wx li{margin:4px 0}
.wx-tbl{overflow-x:auto;margin:10px 0}.wx table{border-collapse:collapse;width:100%;font-size:15px}.wx th,.wx td{border:2px solid #1D2B44;padding:6px 10px;text-align:left;vertical-align:top}.wx th{background:#EAF2FF}.wx td:first-child{font-weight:800;white-space:nowrap}
.wx-sheet{border:2px dashed #1E9A72;border-radius:14px;padding:10px 14px;margin:0 0 16px;background:#F3FBF7;color:#1D2B44}.wx-sheet a{font-weight:900}
`;

function sectionHtml(b) {
  const tbl = (t) => `<div class="wx-tbl"><table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<section><h2>${esc(b.h)}</h2>${(b.p || []).map((x) => `<p>${esc(x)}</p>`).join('')}${b.table ? tbl(b.table) : ''}${b.ul ? `<ul>${b.ul.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${(b.p2 || []).map((x) => `<p>${esc(x)}</p>`).join('')}</section>`;
}

export function studyPage({ cfg, css, s, sheets = [], recent }) {
  const base = baseOf(cfg);
  const sh = sheets.find((x) => x.id === s.sheet);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/study/">中受の読み物</a><span>›</span><span>${esc(s.title)}</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${esc(s.title)}</h1><p class="lead">${esc(s.lead)}</p><p class="mt-upd">最終更新：${esc(jpDate(s.updated).label)}</p></div></section>
${sh ? `<div class="wx-sheet"><b>年表そのものは、印刷できるシートにあります</b><p>→ <a href="${base}/sheets/${sh.id}.html">${esc(sh.title)}（覚えるシート）</a></p></div>` : ''}
<div class="wx">${s.sections.map(sectionHtml).join('')}</div>
${sh ? `<div class="wx-sheet"><p>年表を見ながらおぼえるときは、<a href="${base}/sheets/${sh.id}.html">${esc(sh.title)}</a> を印刷して使ってください。</p></div>` : ''}`;
  return layout({ cfg, css: css + STUDY_CSS, main, recent, title: `${s.seo_title}｜${cfg.siteName}`, desc: s.lead, path: `/study/${s.id}.html`, ogImage: '/og/site.png' });
}

export function studyIndexPage({ cfg, css, items, recent }) {
  const base = baseOf(cfg);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><span>中受の読み物</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>中受の読み物</h1><p class="lead">覚えるシート（ぱっと見る1枚）では書ききれない、おぼえ方や考え方を、じっくり読める形でまとめました。</p></div></section>
<div class="mt-cards">${items.map((s) => `<a class="mt-card" href="${base}/study/${s.id}.html"><span class="sx-cb"><b>${esc(s.title)}</b><small>${esc(s.lead.slice(0, 60))}…</small></span></a>`).join('')}</div>`;
  return layout({ cfg, css: css + STUDY_CSS, main, recent, title: `中受の読み物｜${cfg.siteName}`, desc: '中学受験の勉強で役立つ、おぼえ方や考え方の読み物。', path: '/study/', ogImage: '/og/site.png' });
}
