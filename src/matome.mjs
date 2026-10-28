// まとめページ（時事まとめのハブ・月ごと・年間まとめ・出題予想ランキング・週ごとのふり返りと1枚プリント）
import { esc, inline, plain, jpDate } from './markup.mjs';
import { layout } from './templates.mjs';

const baseOf = (cfg) => cfg.siteUrl.replace(/\/$/, '');

// 分野。月ごとのまとめは記事の subject（かっこの中）と units から自動で分ける。年間まとめは cat に同じキーを使う
export const CATS = [
  ['seiji', '政治・選挙', /政治|国会|内閣|選挙|憲法|皇室|天皇|地方自治|首相|三権|法律/],
  ['kokusai', '国際', /国際|世界|外交|アジア|朝鮮|アメリカ|中国|ロシア|国連|戦争|平和/],
  ['keizai', '経済・くらし', /経済|税|物価|金利|貿易|為替|エネルギー|資源|産業|農業|くらし/],
  ['saigai', '天気・災害', /天気|台風|災害|地震|防災|気候|気象|大雨|火山|津波|流れる水/],
  ['uchu', '宇宙・天体', /宇宙|天体|惑星|流星|日食|月食|太陽系|星|月/],
  ['kankyo', '環境・生き物', /環境|生き物|生物|植物|動物|温暖化|自然|森林|海洋/],
  ['kagaku', '科学・技術', /科学|技術|医療|からだ|情報|AI|ノーベル|発明|研究/],
  ['other', 'そのほか', null],
];
const CAT_NAME = Object.fromEntries(CATS.map(([k, n]) => [k, n]));
export const CAT_KEYS = CATS.map(([k]) => k);

// 文字列の中で、いちばん前に出てくる分野の言葉で決める（「国際・政治」なら国際）
function firstCat(text) {
  let best = null, at = Infinity;
  for (const [k, , re] of CATS) {
    if (!re) continue;
    const m = re.exec(text);
    if (m && m.index < at) { best = k; at = m.index; }
  }
  return best;
}
export function catOf(n) {
  const s = plain(n.subject || '');
  const inner = (/[（(]([^）)]*)[）)]/.exec(s) || [])[1] || '';
  return firstCat(inner) || firstCat((n.units || []).map(plain).join('、')) || firstCat(s) || 'other';
}

// すべての記事を1本ずつの一覧にする
export function flatNews(all) {
  return all.flatMap((a) => a.news.map((n, i) => ({ a, n, i, date: a.date, key: `${a.date}-${i + 1}`, cat: catOf(n), lv: Number(n.exam_level) || 0 })));
}

const STAR = (v) => { v = Math.max(0, Math.min(3, Number(v) || 0)); return v ? `<span class="exam" title="入試に出るかも度"><b>${'★'.repeat(v)}</b><i>${'★'.repeat(3 - v)}</i></span>` : ''; };
const md = (d) => { const j = jpDate(d); return `${j.m}月${j.d}日`; };
const ymLabel = (ym) => `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`;

// 入試の年：3月以降は翌年の入試に向けたまとめ
export const examYearOf = (date) => { const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)); return m >= 3 ? y + 1 : y; };

// 週（月曜はじまり）
export function mondayOf(date) {
  const d = new Date(date + 'T00:00:00Z');
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}
export const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekLabel = (mon) => `${md(mon)}〜${md(addDays(mon, 6))}`;

function newsItem(base, x, withPoint = true) {
  return `<li><a href="${base}/news/${x.key}.html"><span class="d">${jpDate(x.date).label}${STAR(x.lv)}</span><span class="mt">${inline(x.n.title)}</span>${withPoint && x.n.points?.[0] ? `<span class="mp">${inline(x.n.points[0])}</span>` : ''}</a></li>`;
}

// ---------- ハブ ----------
export function hubPage({ cfg, css, months, weeks, year, recent }) {
  const base = baseOf(cfg);
  const main = `<section class="hero hero-list"><div class="hero-tx"><h1>中学受験の時事まとめ</h1><p class="lead">入試の時事問題対策に。年間のまとめ、出題予想ランキング、月ごと・週ごとのふり返りをまとめています。</p></div></section>
${year ? `<div class="mt-cards"><a class="mt-card" href="${base}/matome/${year.exam_year}.html"><b>${year.exam_year}年入試 時事問題まとめ</b><span>今年の重要ニュースを分野別に整理</span></a><a class="mt-card" href="${base}/matome/${year.exam_year}-ranking.html"><b>出題予想ランキング TOP20</b><span>入試に出そうな順に並べました</span></a></div>` : ''}
${weeks.length ? `<h3 class="month">週ごとのふり返り（1枚プリントつき）</h3><ul class="list mt-list">${weeks.map((w) => `<li><a href="${base}/weekly/${w.mon}.html"><span class="d">${w.mon.slice(0, 4)}年</span><span class="mt">${weekLabel(w.mon)}のふり返り</span><span class="mp">${w.count}本のニュース・PDFあり</span></a></li>`).join('')}</ul>` : ''}
<h3 class="month">月ごとのまとめ</h3><ul class="list mt-list">${months.map((m) => `<li><a href="${base}/matome/${m.ym}.html"><span class="mt">${ymLabel(m.ym)}の時事ニュースまとめ</span><span class="mp">${m.count}本</span></a></li>`).join('')}</ul>`;
  return layout({ cfg, css, main, recent, title: `中学受験の時事まとめ（年間・月ごと・週ごと）｜${cfg.siteName}`, desc: '中学受験の時事問題対策に。年間まとめ、出題予想ランキング、月ごと・週ごとのふり返りと印刷できる1枚プリント。', path: '/matome/' });
}

// ---------- 月ごと ----------
export function monthPage({ cfg, css, ym, items, prev, next, year, recent }) {
  const base = baseOf(cfg);
  // 今月の注目：入試に出るかも度が高い順に8本（同じ分野ばかりにならないように選ぶ）
  const sorted = [...items].filter((x) => x.lv >= 2).sort((x, y) => y.lv - x.lv || x.date.localeCompare(y.date));
  const top = [], cnt = {};
  for (const x of sorted) if (top.length < 8 && (cnt[x.cat] || 0) < 2) { top.push(x); cnt[x.cat] = (cnt[x.cat] || 0) + 1; }
  top.sort((x, y) => x.date.localeCompare(y.date) || x.i - y.i);
  const nTop3 = items.filter((x) => x.lv >= 3).length;
  const byCat = CATS.map(([k, name]) => ({ k, name, xs: items.filter((x) => x.cat === k) })).filter((c) => c.xs.length);
  const label = ymLabel(ym);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/matome/">時事まとめ</a><span>›</span><span>${label}</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${label}の時事ニュースまとめ</h1><p class="lead">${label}に紹介したニュース${items.length}本を、分野ごとに整理しました。${nTop3 ? `★3つ（入試に出るかも度が高い）のニュースは${nTop3}本です。` : ''}</p></div></section>
<div class="mt-jump">${byCat.map((c) => `<a href="#${c.k}">${c.name}<small>${c.xs.length}</small></a>`).join('')}</div>
${top.length ? `<section class="mt-sec mt-top"><h2>今月の注目ニュース</h2><ul class="list mt-list">${top.map((x) => newsItem(base, x)).join('')}</ul></section>` : ''}
${byCat.map((c) => `<section class="mt-sec" id="${c.k}"><h2>${c.name}<small>${c.xs.length}本</small></h2><ul class="mt-rows">${c.xs.map((x) => `<li><a href="${base}/news/${x.key}.html"><span class="d">${md(x.date)}</span><span class="t">${esc(plain(x.n.short_title || x.n.title))}</span>${STAR(x.lv)}</a></li>`).join('')}</ul></section>`).join('')}
${year ? `<div class="mt-cards"><a class="mt-card" href="${base}/matome/${year.exam_year}.html"><b>${year.exam_year}年入試 時事問題まとめ</b><span>1年分の重要ニュースはこちら</span></a></div>` : ''}
<nav class="pager">${prev ? `<a class="prev" href="${base}/matome/${prev}.html"><small>前の月</small>${ymLabel(prev)}</a>` : '<span></span>'}${next ? `<a class="next" href="${base}/matome/${next}.html"><small>次の月</small>${ymLabel(next)}</a>` : '<span></span>'}</nav>`;
  return layout({ cfg, css, main, recent, title: `${label}の時事ニュースまとめ｜中学受験の時事問題｜${cfg.siteName}`, desc: `${label}の時事ニュース${items.length}本を、中学受験の分野ごとにまとめました。` + top.slice(0, 4).map((x) => plain(x.n.short_title || x.n.title)).join('、'), path: `/matome/${ym}.html`, ogImage: items[0] ? `/og/${items[items.length - 1].date}.png` : '' });
}

// ---------- 年間まとめ ----------
function topicBlock(base, t, newsByKey) {
  const rel = (t.related || []).map((k) => newsByKey.get(k)).filter(Boolean);
  return `<article class="mt-topic" id="${esc(t.id)}" style="--c:var(--sky)">
  <div class="art-head"><span class="mt-when">${esc(t.when || '')}</span>${STAR(t.stars)}</div>
  <h3>${inline(t.title)}</h3>
  <ul class="mt-pts">${(t.points || []).map((p) => `<li>${inline(p)}</li>`).join('')}</ul>
  ${t.why ? `<p class="mt-why"><b>入試ではここが出る</b>${inline(t.why)}</p>` : ''}
  ${(t.keywords || []).length ? `<div class="mt-kw">${t.keywords.map((k) => `<span>${inline(k)}</span>`).join('')}</div>` : ''}
  ${rel.length ? `<div class="mt-rel"><b>くわしい記事</b>${rel.map((x) => `<a href="${base}/news/${x.key}.html">${md(x.date)}「${esc(plain(x.n.short_title || x.n.title))}」</a>`).join('')}</div>` : ''}
</article>`;
}

export function yearPage({ cfg, css, year, newsByKey, recent }) {
  const base = baseOf(cfg);
  const byCat = CATS.map(([k, name]) => ({ k, name, ts: year.topics.filter((t) => t.cat === k) })).filter((c) => c.ts.length);
  const title = `${year.exam_year}年入試 時事問題まとめ`;
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/matome/">時事まとめ</a><span>›</span><span>${year.exam_year}年入試</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${title}</h1><p class="lead">${inline(year.intro || '')}</p><p class="mt-upd">対象：${esc(year.period || '')}　最終更新：${esc(jpDate(year.updated).label)}（毎月更新）</p></div></section>
<div class="mt-cards"><a class="mt-card" href="${base}/matome/${year.exam_year}-ranking.html"><b>出題予想ランキング TOP20</b><span>どれから覚える？ 入試に出そうな順</span></a></div>
<div class="mt-jump">${byCat.map((c) => `<a href="#${c.k}">${c.name}<small>${c.ts.length}</small></a>`).join('')}</div>
${byCat.map((c) => `<section class="mt-sec" id="${c.k}"><h2>${c.name}</h2>${c.ts.map((t) => topicBlock(base, t, newsByKey)).join('')}</section>`).join('')}
${(year.sources || []).length ? `<div class="sources"><b>参考にした報道・資料</b><ul>${year.sources.filter((s) => /^https?:\/\//.test(s.url)).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul></div>` : ''}`;
  return layout({ cfg, css, main, recent, title: `${title}｜分野別に重要ニュースを整理｜${cfg.siteName}`, desc: `${year.exam_year}年の中学入試に向けて、${year.period || '今年'}の重要な時事ニュースを政治・国際・経済・環境・科学・災害などの分野別に、小学生にもわかる言葉でまとめました。`, path: `/matome/${year.exam_year}.html` });
}

export function rankingPage({ cfg, css, year, recent }) {
  const base = baseOf(cfg);
  const byId = new Map(year.topics.map((t) => [t.id, t]));
  const rows = year.ranking.map((r, i) => ({ r, t: byId.get(r.id), no: i + 1 })).filter((x) => x.t);
  const title = `${year.exam_year}年入試 時事問題 出題予想ランキングTOP20`;
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/matome/">時事まとめ</a><span>›</span><span>出題予想ランキング</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${title}</h1><p class="lead">${year.exam_year}年の中学入試に出そうな時事ニュースを、ニュースの大きさ・教科書とのつながり・入試でのよく出るテーマをもとに予想して並べました。上から順におさえていきましょう。</p><p class="mt-upd">最終更新：${esc(jpDate(year.updated).label)}（毎月更新）</p></div></section>
<ol class="mt-rank">${rows.map(({ r, t, no }) => `<li><span class="rk${no <= 3 ? ' rk-top' : ''}">${no}</span><div><a href="${base}/matome/${year.exam_year}.html#${esc(t.id)}"><b>${inline(t.title)}</b></a><span class="rk-meta">${esc(CAT_NAME[t.cat] || '')}・${esc(t.when || '')}${STAR(t.stars)}</span><p>${inline(r.reason || '')}</p></div></li>`).join('')}</ol>
<div class="mt-cards"><a class="mt-card" href="${base}/matome/${year.exam_year}.html"><b>${year.exam_year}年入試 時事問題まとめ</b><span>くわしい説明とキーワードはこちら</span></a></div>
<p class="mt-note">※ランキングは、じじたね編集部（AI）による予想です。実際の出題を保証するものではありません。</p>`;
  return layout({ cfg, css, main, recent, title: `${title}｜${cfg.siteName}`, desc: `${year.exam_year}年中学入試の時事問題の出題予想ランキング。` + rows.slice(0, 5).map(({ t }) => plain(t.title)).join('、') + 'など。', path: `/matome/${year.exam_year}-ranking.html` });
}

// ---------- 週ごとのふり返り・1枚プリント ----------
export function weekData(mon, all) {
  const days = all.filter((a) => a.date >= mon && a.date <= addDays(mon, 6));
  const items = flatNews(days);
  const picks = [...items].sort((x, y) => y.lv - x.lv || x.date.localeCompare(y.date) || x.i - y.i);
  // 重要ニュースは6本。同じ分野ばかりにならないよう、まず分野ごとに1本ずつ選び、残りを順に足す
  const main = [], used = new Set();
  for (const x of picks) if (main.length < 6 && !used.has(x.cat)) { main.push(x); used.add(x.cat); }
  for (const x of picks) if (main.length < 6 && !main.includes(x)) main.push(x);
  main.sort((x, y) => x.date.localeCompare(y.date) || x.i - y.i);
  const quiz = [...main, ...picks.filter((x) => !main.includes(x))].filter((x) => Array.isArray(x.n.quiz?.choices) && x.n.quiz.choices.length >= 2).slice(0, 5);
  return { mon, days, items, main, quiz };
}

const SHEET_CSS = `
.sheet{--k:#1D2B44;--m:#56677F;--l:#C9D8E6;--y:#FFE36E;--g:#1E9A72;--o:#DB7420;color:var(--k);font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Noto Sans JP",sans-serif;font-size:10.2pt;line-height:1.55;background:#fff}
.sheet ruby rt{font-size:.5em}
.sheet .sh-head{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid var(--k);padding-bottom:4px;margin-bottom:8px}
.sheet .sh-brand{font-weight:900;font-size:11pt}.sheet .sh-brand i{font-style:normal;border:1.5px solid var(--k);border-radius:4px;padding:0 3px;margin-right:4px;font-size:9pt}
.sheet .sh-title{font-weight:900;font-size:17pt;line-height:1.2}.sheet .sh-title small{display:block;font-size:10pt;color:var(--m);font-weight:700}
.sheet .sh-name{font-size:9.5pt;color:var(--m);text-align:right;white-space:nowrap}.sheet .sh-name span{display:inline-block;width:42mm;border-bottom:1px solid var(--k);margin-left:4px}
.sheet h4{margin:8px 0 4px;font-size:11pt;font-weight:900;display:flex;align-items:center;gap:6px}.sheet h4::before{content:"";width:6px;height:14px;background:var(--y);border:1.5px solid var(--k);border-radius:2px}
.sheet table{width:100%;border-collapse:collapse;font-size:9pt}.sheet td{border-bottom:1px dotted var(--l);padding:2px 4px;vertical-align:top}.sheet td.dd{white-space:nowrap;font-weight:900;width:17mm}
.sheet .sh-main{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sheet .sh-box{border:1.5px solid var(--k);border-radius:8px;padding:5px 8px;break-inside:avoid}
.sheet .sh-box .sb-h{display:flex;gap:6px;align-items:center;font-size:8.5pt;color:var(--m);font-weight:700}
.sheet .sh-box .sb-h .st{color:#E8A400;letter-spacing:1px}
.sheet .sh-box b.sb-t{display:block;font-size:10.5pt;line-height:1.45;margin:1px 0 2px}
.sheet .sh-box ul{margin:0;padding-left:1.1em;font-size:9pt;line-height:1.5}
.sheet .sh-q{margin:0;padding:0;list-style:none;counter-reset:q}
.sheet .sh-q>li{counter-increment:q;margin:0 0 5px;break-inside:avoid;font-size:9.4pt}
.sheet .sh-q>li::before{content:"問" counter(q);font-weight:900;margin-right:4px;background:var(--k);color:#fff;border-radius:4px;padding:0 4px;font-size:8.5pt}
.sheet .sh-ch{display:flex;flex-wrap:wrap;gap:2px 14px;margin:1px 0 0 2.6em;font-size:9pt}
.sheet .sh-ans{float:right;font-size:8.5pt;color:var(--m)}.sheet .sh-ans span{display:inline-block;width:12mm;height:5mm;border:1px solid var(--k);border-radius:3px;vertical-align:middle;margin-left:3px}
.sheet .sh-foot{margin-top:8px;border-top:2px dashed var(--l);padding-top:4px;display:flex;justify-content:space-between;gap:10px;font-size:8.2pt;color:var(--m)}
.sheet .sh-foot b{color:var(--k)}
.sheet .sh-key{font-size:8.5pt;transform:rotate(180deg);display:inline-block}
@media (max-width:600px){.wk-sheet{padding:12px}.wk-sheet .sh-main{grid-template-columns:1fr}.wk-sheet tr{display:block;padding:4px 0;border-bottom:1px dotted #C9D8E6}.wk-sheet td{display:block;border:0;padding:1px 4px}.wk-sheet .sh-head{flex-wrap:wrap}.wk-sheet .sh-name{display:none}}
`;

function sheetHtml(cfg, w) {
  const base = baseOf(cfg).replace(/^https?:\/\//, '');
  const dl = { ja: (d) => { const j = jpDate(d); return `${j.m}/${j.d}（${j.wd.replace('曜日', '').replace('曜', '')}）`; } };
  const key = w.quiz.map((x, i) => `問${i + 1} ${'ABCD'[Number(x.n.quiz.answer) || 0]}`).join('　');
  return `<div class="sheet">
<div class="sh-head"><div><div class="sh-brand"><i>${esc(cfg.brandPrefix || '')}</i>${esc(cfg.brandMain || cfg.siteName)}</div><div class="sh-title">今週の時事 1枚プリント<small>${esc(w.mon.slice(0, 4))}年 ${weekLabel(w.mon)}</small></div></div><div class="sh-name">名前<span></span></div></div>
<h4>今週のニュース一覧</h4>
<table>${w.days.map((a) => `<tr><td class="dd">${dl.ja(a.date)}</td>${a.news.map((n, i) => `<td>${'①②③'[i]} ${esc(plain(n.short_title || n.title))}</td>`).join('')}</tr>`).join('')}</table>
<h4>入試に出るかも！今週の重要ニュース</h4>
<div class="sh-main">${w.main.map((x) => `<div class="sh-box"><div class="sb-h"><span>${esc(dl.ja(x.date))}</span><span>${esc(plain(x.n.subject))}</span><span class="st">${'★'.repeat(Math.max(0, Math.min(3, x.lv)))}</span></div><b class="sb-t">${inline(x.n.title)}</b><ul>${(x.n.points || []).slice(0, 2).map((p) => `<li>${inline(p)}</li>`).join('')}</ul></div>`).join('')}</div>
${w.quiz.length ? `<h4>確認テスト</h4><ol class="sh-q">${w.quiz.map((x) => `<li><span class="sh-ans">答え<span></span></span>${inline(x.n.quiz.q)}<div class="sh-ch">${x.n.quiz.choices.map((c, j) => `<span>${'ABCD'[j]}. ${inline(c)}</span>`).join('')}</div></li>`).join('')}</ol>` : ''}
<div class="sh-foot"><div><b>${esc(base)}</b>　毎朝3本の時事ニュースを、ふりがな・図解・クイズで。<br>家庭・塾・学校での印刷・配布は自由です（内容の改変・販売はご遠慮ください）。</div>${key ? `<div>答え：<span class="sh-key">${esc(key)}</span></div>` : ''}</div>
</div>`;
}

export function printHtml(cfg, w) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>今週の時事 1枚プリント ${weekLabel(w.mon)}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:9mm 10mm}html,body{margin:0;background:#fff}${SHEET_CSS}</style></head><body>${sheetHtml(cfg, w)}</body></html>`;
}

export function weeklyPage({ cfg, css, w, prev, next, recent }) {
  const base = baseOf(cfg);
  const label = weekLabel(w.mon);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/matome/">時事まとめ</a><span>›</span><span>${label}</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${label}の時事ふり返り</h1><p class="lead">この週に紹介したニュース${w.items.length}本の一覧と、入試に出るかも度の高いニュース、確認テストを1枚にまとめました。印刷して、週末の見直しにどうぞ。</p>
<div class="wk-dl"><a class="btn wk-btn" href="${base}/weekly/${w.mon}.pdf" download>1枚プリント（PDF）をダウンロード</a><span>A4・1枚／家庭・塾・学校での印刷・配布は自由です</span></div></div></section>
<div class="wk-sheet">${sheetHtml(cfg, w)}</div>
<h3 class="month">この週の記事</h3><ul class="list mt-list">${w.items.map((x) => newsItem(base, x, false)).join('')}</ul>
<nav class="pager">${prev ? `<a class="prev" href="${base}/weekly/${prev}.html"><small>前の週</small>${weekLabel(prev)}</a>` : '<span></span>'}${next ? `<a class="next" href="${base}/weekly/${next}.html"><small>次の週</small>${weekLabel(next)}</a>` : '<span></span>'}</nav>`;
  return layout({ cfg, css: css + SHEET_CSS, main, recent, title: `${label}の時事ふり返り（印刷できる1枚プリント）｜${cfg.siteName}`, desc: `${w.mon.slice(0, 4)}年${label}の時事ニュース${w.items.length}本のふり返り。印刷できるA4の1枚プリント（PDF）と確認テストつき。`, path: `/weekly/${w.mon}.html`, ogImage: w.days.length ? `/og/${w.days[w.days.length - 1].date}.png` : '' });
}
