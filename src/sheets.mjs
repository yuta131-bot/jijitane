// 「覚えるシート」：時事の基本シートと、算数・社会・国語の基本シート。
// content/sheets/*.json から、サイトのページ（/sheets/）と、印刷用のA4・PDF（/gift/sheet-○○.pdf）を作る
import fs from 'node:fs';
import path from 'node:path';
import { esc, inline, plain, jpDate } from './markup.mjs';
import { layout } from './templates.mjs';
import { fig, FIG_NAMES } from './figs.mjs';
import { art, pickArt, CARD_ART } from './art.mjs';

const baseOf = (cfg) => cfg.siteUrl.replace(/\/$/, '');
export const GROUPS = [
  ['jiji', '時事の覚えるシート', 'ニュースを読むときの「ものさし」になる、政治・国際・環境の基本'],
  ['kihon', '基本の覚えるシート', '算数・社会・国語で、毎日ひらく「手元の1枚」'],
];
const BLOCKS = new Set(['table', 'cards', 'kanji', 'tips', 'quiz', 'list', 'text', 'figs', 'test', 'map', 'memo']);
const PREF = JSON.parse(fs.readFileSync(new URL('./japan-pref.json', import.meta.url), 'utf8'));

export function loadSheets(dir = 'content/sheets') {
  if (!fs.existsSync(dir)) return [];
  const order = Object.fromEntries(['kenpo-sanken', 'kokusai', 'kankyo-kagaku', 'tani-wariai', 'zukei', 'nenpyo', 'todofuken', 'bushu'].map((k, i) => [k, i]));
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const errs = validateSheet(s);
    if (errs.length) throw new Error(`${f} に問題があります:\n- ${errs.join('\n- ')}`);
    return s;
  }).sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
}

export function validateSheet(s) {
  const errs = [];
  if (!/^[a-z0-9-]+$/.test(s.id || '')) errs.push('id は半角英数字とハイフンだけにしてください');
  if (!['jiji', 'kihon'].includes(s.group)) errs.push('group は jiji か kihon です');
  for (const k of ['title', 'sub', 'intro', 'updated']) if (!s[k]) errs.push(`${k} がありません`);
  if (!Array.isArray(s.pages) || !s.pages.length) errs.push('pages がありません');
  const check = (b, where) => {
    if (!b || !BLOCKS.has(b.t)) { errs.push(`${where}：不明なブロック ${b?.t}`); return; }
    if (b.t === 'table') {
      if (!Array.isArray(b.head) || !Array.isArray(b.rows)) errs.push(`${where}：table に head / rows がありません`);
      else for (const r of b.rows) if (r.length !== b.head.length) errs.push(`${where}「${b.title || ''}」：列の数がちがう行があります（${r.join(' / ')}）`);
    }
    const figOk = (f) => !f || FIG_NAMES.includes(f[0]);
    if (b.t === 'figs' && !(b.items || []).every((x) => figOk(x.fig))) errs.push(`${where}：知らない図形があります`);
    if (b.t === 'test' && !(b.items || []).every((x) => x.q && x.a != null && figOk(x.fig))) errs.push(`${where}：test の items は {q, a, fig?} です`);
    if (b.t === 'kanji' && !(b.items || []).every((x) => Array.isArray(x) && x.length === 3)) errs.push(`${where}：kanji の items は [字, 名前, 例] です`);
  };
  (s.pages || []).forEach((p, i) => (p.blocks || []).forEach((b, j) => (Array.isArray(b) ? b : [b]).forEach((x) => check(x, `${i + 1}ページ目の${j + 1}番目`))));
  return errs;
}

// ---------- ブロック ----------
const cell = (v) => inline(String(v ?? ''));
function table(b) {
  const head = b.head.some((h) => h !== '') ? `<thead><tr>${b.head.map((h) => `<th>${cell(h)}</th>`).join('')}</tr></thead>` : '';
  return `<section class="sx-b"><h4>${cell(b.title || '')}</h4><div class="sx-sc"><table class="sx-t${b.cls ? ' ' + b.cls : ''}${b.first ? ' first' : ''}">${head}<tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${b.note ? `<p class="sx-n">${cell(b.note)}</p>` : ''}</section>`;
}
function cards(b) {
  return `<section class="sx-b">${b.title ? `<h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4>` : ''}<div class="sx-cards" style="--cols:${b.cols || 3}">${b.items.map((it) => `<div class="sx-card c-${it.c || 'g'}"><b>${cell(it.h)}</b><ul>${it.lines.map((l) => `<li>${cell(l)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
}
function kanji(b) {
  return `<section class="sx-b sx-k k-${b.color || 'blue'}"><h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-kg" style="--cols:${b.cols || 6}">${b.items.map(([c, n, e]) => `<div class="sx-kc${e ? '' : ' sdg'}"><span class="c">${esc(c)}</span><span class="n">${cell(n)}</span>${e ? `<span class="e">${cell(e)}</span>` : ''}</div>`).join('')}</div></section>`;
}
function tips(b) {
  return `<section class="sx-b"><h4>${cell(b.title)}</h4><div class="sx-cards" style="--cols:${b.cols || 3}">${b.items.map((it) => `<div class="sx-card c-r"><b>${cell(it.h)}</b><ul>${it.lines.map((l) => `<li>${cell(l)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
}
function quiz(b) {
  return `<section class="sx-b sx-quiz"><h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-qg">${b.items.map(([k]) => `<div class="sx-q"><span class="qk">${esc(k)}</span><span class="ql"><span>部首：<i></i></span><span>名前：<i></i></span></span></div>`).join('')}</div><p class="sx-ans">こたえ：${b.items.map(([k, a]) => `${esc(k)}＝${cell(a)}`).join('　')}</p></section>`;
}
function list(b) {
  return `<section class="sx-b"><h4>${cell(b.title)}</h4><ul class="sx-l">${b.items.map((i) => `<li>${cell(i)}</li>`).join('')}</ul></section>`;
}

// ---------- 図形カード・確認テスト・日本地図 ----------
const CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
function figs(b) {
  return `<section class="sx-b"><h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-figs" style="--cols:${b.cols || 4}">${b.items.map((it) => `<div class="sx-fc"><div class="fg">${fig(it.fig)}</div><b>${cell(it.cap)}</b>${it.f ? `<span>${cell(it.f)}</span>` : ''}${it.g ? `<span>${cell(it.g)}</span>` : ''}</div>`).join('')}</div></section>`;
}
function test(b) {
  return `<section class="sx-b sx-test"><h4>${cell(b.title || '確認テスト')}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-tg" style="--cols:${b.cols || 2}">${b.items.map((it, i) => `<div class="sx-ti"><span class="no">${CIRC[i] || i + 1}</span>${it.fig ? `<div class="tf">${fig(it.fig)}</div>` : ''}<div class="tb"><span class="tq">${cell(it.q)}</span><span class="tl">答え <i></i>${it.u ? cell(it.u) : ''}</span></div></div>`).join('')}</div><p class="sx-ans">こたえ：${b.items.map((it, i) => `${CIRC[i] || i + 1} ${cell(it.a)}`).join('　')}</p></section>`;
}
const REGIONS = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'];
const REGION_FILL = ['#BFE3F5', '#CDEBC8', '#FFE3A3', '#F5C9D8', '#D9CCF0', '#FFD2AE', '#BFE8E0', '#F0C9C0'];
function prefSvg(blank) {
  const { W, H, inset, prefs } = PREF;
  return `<svg class="sx-mapsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="日本地図（都道府県）"><rect width="${W}" height="${H}" rx="10" fill="#EEF6FC"/>`
    + `<rect x="${inset.x}" y="${inset.y}" width="${inset.w}" height="${inset.h}" rx="6" fill="#fff" stroke="#9BB0C6" stroke-dasharray="4 3"/><text x="${inset.x + 6}" y="${inset.y + 12}" font-size="10" font-weight="700" fill="#56677F">南西諸島</text>`
    + prefs.map((p) => `<path d="${p.d}" fill="${blank ? '#FFFFFF' : REGION_FILL[p.region - 1]}" stroke="#1D2B44" stroke-width="0.9" stroke-linejoin="round" fill-rule="evenodd"/>`).join('')
    + prefs.map((p) => `<text x="${p.lx}" y="${p.ly + 3.6}" text-anchor="middle" font-size="${p.code === 13 || p.code === 27 || p.code === 37 || p.code === 26 || p.code === 28 || p.code === 25 || p.code === 29 || p.code === 30 || p.code === 14 || p.code === 11 || p.code === 12 ? 9 : 10.5}" font-weight="900" fill="#1D2B44">${p.code}</text>`).join('')
    + `</svg>`;
}
function map(b) {
  const { prefs } = PREF;
  if (b.mode === 'blank') {
    const half = Math.ceil(prefs.length / 2);
    const col = (xs) => `<div class="sx-ac">${xs.map((p) => `<div class="sx-ar"><span class="n">${p.code}</span><i></i></div>`).join('')}</div>`;
    return `<section class="sx-b sx-map blank"><h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-mw"><div class="sx-mp">${prefSvg(true)}</div><div class="sx-al">${col(prefs.slice(0, half))}${col(prefs.slice(half))}</div></div><p class="sx-ans">こたえ：${prefs.map((p) => `${p.code} ${esc(p.name)}`).join('　')}</p></section>`;
  }
  const legend = REGIONS.map((r, i) => `<div class="sx-rg"><b style="background:${REGION_FILL[i]}">${esc(r)}</b><span>${prefs.filter((p) => p.region === i + 1).map((p) => `<i><em>${p.code}</em>${esc(p.name.replace(/[都府県]$/, ''))}</i>`).join('')}</span></div>`).join('');
  return `<section class="sx-b sx-map"><h4>${cell(b.title)}${b.note ? `<small>${cell(b.note)}</small>` : ''}</h4><div class="sx-mw"><div class="sx-mp">${prefSvg(false)}</div><div class="sx-ml">${legend}</div></div></section>`;
}
const memo = (b) => `<section class="sx-b"><h4>${cell(b.title)}</h4><div class="sx-memo">${'<div></div>'.repeat(b.lines || 5)}</div></section>`;
const text = (b) => `<p class="sx-text">${cell(b.text)}</p>`;
const RENDER = { table, cards, kanji, tips, quiz, list, text, figs, test, map, memo };
// 見出し（h4）の左に、内容に合った絵を入れる。カードは見出し文字から絵をえらぶ
const ICON_SKIP = new Set(['text', 'memo', 'map']);
function one(b) {
  let h = RENDER[b.t](b);
  if (ICON_SKIP.has(b.t) || b.ic === false) return h;
  const n = b.ic || pickArt(b.title);
  if (n) h = h.replace('<h4>', `<h4 class="hi">${art(n)}`);
  if (b.t === 'cards') h = h.replace(/<div class="sx-card c-(\w+)"><b>([^<]*)/g, (m, c, t) => { const a = pickArt(t); return CARD_ART.has(a) ? `<div class="sx-card c-${c}"><b class="hc">${art(a, 'sx-ci')}${t}` : m; });
  return h;
}
const block = (b) => (Array.isArray(b) ? `<div class="sx-row n${b.length}">${b.map((x) => one(x)).join('')}</div>` : one(b));

const footNote = (cfg, s) => {
  const base = baseOf(cfg).replace(/^https?:\/\//, '');
  const dt = jpDate(s.updated);
  return `<div class="sh-foot"><div><b>${esc(base)}</b>　毎朝3本の時事ニュースを、ふりがな・図解・クイズで。<br>家庭・塾・学校での印刷・配布は自由です（内容の改変・販売はご遠慮ください）。</div><div>最終更新：${esc(dt.label)}${s.asof ? `<br>${esc(s.asof)}の内容` : ''}</div></div>`;
};

// ---------- 印刷用（A4・おもて／うらの2ページ） ----------
const SX_CSS = `
.sx{--k:#1D2B44;--m:#56677F;--l:#C9D8E6;--y:#FFE36E;--g:#1E9A72;--o:#DB7420;color:var(--k);font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Noto Sans JP",sans-serif;line-height:1.45}
.sx h4{margin:7px 0 3px;font-size:10.5pt;font-weight:900;display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}
.sx h4::before{content:"";align-self:center;width:6px;height:13px;background:var(--y);border:1.5px solid var(--k);border-radius:2px}
.sx h4.hi::before{display:none}.sx h4.hi{align-items:center;flex-wrap:nowrap}.sx h4.hi small{flex:1 1 0;min-width:0}.sx .sx-ic{width:11mm;height:11mm;flex:none;margin-right:-2px}
.sx .sx-card b.hc{display:flex;align-items:center;gap:6px}.sx .sx-ci{width:6mm;height:6mm;margin:-.4mm 0;flex:none;background:#fff;border-radius:50%;padding:.6mm;box-sizing:content-box}
.sx h4 small{font-size:7.8pt;color:var(--m);font-weight:700}
.sx .sx-pg-label{display:inline-block;margin-left:6px;font-size:9pt;background:var(--k);color:#fff;border-radius:999px;padding:0 9px;vertical-align:middle}
.sx .sx-b{break-inside:avoid;margin:0}.sx .sx-b>h4:first-child{margin-top:6px}
.sx .sx-row{display:grid;gap:0 10px;align-items:start}.sx .sx-row.n2{grid-template-columns:1fr 1fr}.sx .sx-row.n3{grid-template-columns:1fr 1fr 1fr}
.sx .sx-sc{overflow-x:auto}
.sx table.sx-t{width:100%;border-collapse:collapse;font-size:8.2pt}
.sx .sx-t th{background:#E7EEF6;font-weight:900;border:1px solid var(--l);padding:2px 5px;text-align:left;white-space:nowrap}
.sx .sx-t td{border:1px solid var(--l);padding:2px 5px;vertical-align:top}
.sx .sx-t.first td:first-child{font-weight:900;background:#F6F9FC;white-space:nowrap}
.sx .sx-t.compact{font-size:7.4pt}.sx .sx-t.compact td,.sx .sx-t.compact th{padding:1px 3px}
.sx .sx-n{margin:2px 0 0;font-size:7.8pt;color:var(--m)}
.sx .sx-cards{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:6px}
.sx .sx-card{border:1.5px solid var(--k);border-radius:8px;overflow:hidden;background:#fff;break-inside:avoid}
.sx .sx-card>b{display:block;padding:2px 8px;font-size:8.8pt;color:#fff}
.sx .sx-card ul{margin:0;padding:3px 8px 4px 20px;font-size:8pt;line-height:1.45}
.sx .c-g>b{background:var(--g)}.sx .c-b>b{background:#3C78C2}.sx .c-o>b{background:var(--o)}.sx .c-p>b{background:#7A5BC0}.sx .c-r>b{background:#D9526B}
.sx .sx-k{border-radius:10px;padding:2px 8px 6px;margin-top:5px;background:var(--bg);border:1.5px solid var(--bd)}
.sx .sx-k>h4{margin-top:3px}
.sx .sx-kg{display:grid;grid-template-columns:repeat(var(--cols,6),1fr);gap:3px}
.sx .sx-kc{background:#fff;border:1px solid var(--bd);border-radius:6px;padding:1px 2px 2px;text-align:center;display:flex;flex-direction:column;align-items:center;line-height:1.2;break-inside:avoid}
.sx .sx-kc .c{font-size:15pt;font-weight:900;color:var(--bd);line-height:1.15}
.sx .sx-kc .n{font-size:6.6pt;color:var(--m);font-weight:700}
.sx .sx-kc .e{font-size:7.8pt;letter-spacing:.06em;font-weight:700}
.sx .sx-kc.sdg{flex-direction:row;text-align:left;gap:6px;padding:2px 6px;justify-content:flex-start}
.sx .sx-kc.sdg .c{font-size:12pt;min-width:1.4em;text-align:center}.sx .sx-kc.sdg .n{font-size:8pt;color:var(--k)}
.sx .k-red{--bg:#FDEDF0;--bd:#C93C5A}.sx .k-blue{--bg:#E9F1FB;--bd:#2F6DB5}.sx .k-yellow{--bg:#FFF6DC;--bd:#B7840A}.sx .k-green{--bg:#E5F6EE;--bd:#17835F}.sx .k-purple{--bg:#F0EBFA;--bd:#6C4DB5}.sx .k-orange{--bg:#FDEFE0;--bd:#C8661A}.sx .k-teal{--bg:#E3F4F8;--bd:#177B92}
.sx .sx-l{margin:0;padding-left:1.2em;font-size:8.2pt;line-height:1.5}
.sx .sx-text{margin:4px 0;padding:4px 8px;background:#F6F9FC;border-radius:8px;font-size:8.2pt;color:var(--m)}
.sx .sx-qg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px}
.sx .sx-q{display:flex;align-items:flex-end;gap:6px;border:1.5px dashed var(--l);border-radius:8px;padding:3px 6px}
.sx .sx-q .qk{font-size:20pt;font-weight:900;line-height:1.1;background:#FFF0C2;border-radius:6px;padding:0 6px}
.sx .sx-q .ql{display:flex;flex-direction:column;font-size:7.4pt;color:var(--m);line-height:1.9;white-space:nowrap}.sx .sx-q .ql i{display:inline-block;width:11mm;border-bottom:1px solid var(--k)}
.sx .sx-ans{margin:3px 0 0;font-size:7pt;color:var(--m);transform:rotate(180deg);text-align:left}

.sx .sx-figs{display:grid;grid-template-columns:repeat(var(--cols,4),1fr);gap:5px}
.sx .sx-fc{border:1.5px solid var(--k);border-radius:8px;background:#fff;text-align:center;padding:2px 4px 4px;break-inside:avoid}
.sx .sx-fc .fg{display:flex;justify-content:center}.sx .sx-fc svg{width:100%;max-width:34mm;height:auto}
.sx .sx-fc b{display:block;font-size:8.6pt;line-height:1.25}.sx .sx-fc span{display:block;font-size:7.8pt;color:#8A4A10;font-weight:700;line-height:1.3}
.sx .sx-fig text{font-family:"Zen Maru Gothic","Noto Sans JP",sans-serif}
.sx .sx-tg{display:grid;grid-template-columns:repeat(var(--cols,2),1fr);gap:4px 8px}
.sx .sx-ti{display:flex;align-items:center;gap:6px;border:1.5px dashed var(--l);border-radius:8px;padding:3px 6px;break-inside:avoid}
.sx .sx-ti .no{flex:none;width:5.2mm;height:5.2mm;border-radius:50%;background:var(--k);color:#fff;font-size:7pt;font-weight:900;display:flex;align-items:center;justify-content:center}
.sx .sx-ti .tf{flex:none;width:24mm}.sx .sx-ti .tf svg{width:100%;height:auto}
.sx .sx-ti .tb{flex:1}.sx .sx-ti .tq{display:block;font-size:8.2pt;line-height:1.4}
.sx .sx-ti .tl{display:block;margin-top:3px;color:var(--m);font-size:7.6pt}.sx .sx-ti .tl i{display:inline-block;width:22mm;border-bottom:1px solid var(--k);margin:0 2px}
.sx .sx-mw{display:grid;grid-template-columns:1.5fr 1fr;gap:8px;align-items:start}
.sx .sx-mapsvg{width:100%;height:auto;display:block}
.sx .sx-ml{display:flex;flex-direction:column;gap:3px}
.sx .sx-rg{border:1.5px solid var(--k);border-radius:6px;overflow:hidden;break-inside:avoid}
.sx .sx-rg b{display:block;padding:0 6px;font-size:8pt;border-bottom:1px solid var(--k)}
.sx .sx-rg span{display:flex;flex-wrap:wrap;gap:0 7px;padding:1px 6px 2px;font-size:7.6pt;line-height:1.5}
.sx .sx-rg i{font-style:normal;white-space:nowrap}.sx .sx-rg em{font-style:normal;font-weight:900;color:var(--m);margin-right:1px;font-size:6.6pt}
.sx .sx-al{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.sx .sx-ar{display:flex;align-items:flex-end;gap:3px;height:6.4mm}.sx .sx-ar .n{width:5mm;text-align:right;font-weight:900;font-size:8pt;color:var(--m)}.sx .sx-ar i{flex:1;border-bottom:1px solid var(--k);height:4.4mm}
.sx .sx-memo div{border-bottom:1px solid var(--l);height:8.5mm}
.sx .sx-pg{background:#fff}
.sx .sh-head{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid var(--k);padding-bottom:3px;margin-bottom:4px}
.sx .sh-brand{font-weight:900;font-size:10pt}.sx .sh-brand i{font-style:normal;border:1.5px solid var(--k);border-radius:4px;padding:0 3px;margin-right:4px;font-size:8.5pt}
.sx .sh-title{font-weight:900;font-size:16pt;line-height:1.2}.sx .sh-title small{display:block;font-size:9pt;color:var(--m);font-weight:700}
.sx .sh-name{font-size:9pt;color:var(--m);text-align:right;white-space:nowrap}.sx .sh-name span{display:inline-block;width:38mm;border-bottom:1px solid var(--k);margin-left:4px}
.sx .sh-foot{margin-top:6px;border-top:2px dashed var(--l);padding-top:3px;display:flex;justify-content:space-between;gap:10px;font-size:7.4pt;color:var(--m)}.sx .sh-foot b{color:var(--k)}
@media (max-width:700px){

 .sx-site .sx-figs{grid-template-columns:repeat(2,1fr)}.sx-site .sx-fc svg{max-width:150px}
 .sx-site .sx-tg{grid-template-columns:1fr}.sx-site .sx-ti .tf{width:110px}.sx-site .sx-memo div{height:30px}
 .sx-site .sx-mw{grid-template-columns:1fr}.sx-site .sx-al{grid-template-columns:1fr 1fr}
 .sx-site .sx-row.n2,.sx-site .sx-row.n3{grid-template-columns:1fr}
 .sx-site .sx-cards{grid-template-columns:1fr}
 .sx-site .sx-kg{grid-template-columns:repeat(auto-fill,minmax(66px,1fr))}
 .sx-site .sx-kc.sdg{grid-column:1/-1}
 .sx-site .sx-qg{grid-template-columns:1fr 1fr}
 .sx-site table.sx-t{font-size:12.5px}.sx-site .sx-l,.sx-site .sx-card ul{font-size:13px}.sx-site .sx-n,.sx-site .sx-text{font-size:12px}
 .sx-site .sx-t.first td:first-child{white-space:normal}
}
@media screen and (min-width:701px){.sx-site .sx-fc b{font-size:14px}.sx-site .sx-fc span{font-size:12.5px}.sx-site .sx-ti .tq{font-size:13.5px}.sx-site .sx-ti .tl{font-size:12.5px}.sx-site .sx-ti .no{width:22px;height:22px;font-size:12px}.sx-site .sx-rg b{font-size:13px}.sx-site .sx-rg span{font-size:12.5px}.sx-site .sx-rg em{font-size:11px}.sx-site .sx-ar .n{font-size:13px}.sx-site .sx-ar{height:26px}.sx-site .sx-ar i{height:18px}.sx-site .sx-ti .tf{width:130px}.sx-site .sx-kc .c{font-size:22px}.sx-site .sx-kc .n{font-size:10.5px}.sx-site .sx-kc .e{font-size:12.5px}.sx-site table.sx-t{font-size:13.5px}.sx-site .sx-l,.sx-site .sx-card ul{font-size:13.5px}.sx-site .sx-card>b{font-size:14px}.sx-site h4{font-size:16px}.sx-site h4 small{font-size:12px}.sx-site .sx-n,.sx-site .sx-text{font-size:12.5px}.sx-site .sx-q .qk{font-size:30px}.sx-site .sx-q .ql{font-size:11.5px}.sx-site .sx-ans{font-size:11.5px}.sx-site .sx-kc.sdg .c{font-size:18px}.sx-site .sx-kc.sdg .n{font-size:13px}}
`;

function pageHtml(cfg, s, p, i, print) {
  const base = baseOf(cfg).replace(/^https?:\/\//, '');
  const body = (p.blocks || []).map(block).join('');
  if (!print) return `<div class="sx-pg"><h3 class="month">${esc(p.label)}</h3>${body}</div>`;
  const z = p.scale ? ` data-fixed="1" style="zoom:${p.scale}"` : p.maxz ? ` data-maxz="${p.maxz}"` : '';
  return `<div class="sx sx-pg"${z}><div class="sh-head"><div><div class="sh-brand"><i>${esc(cfg.brandPrefix || '')}</i>${esc(cfg.brandMain || cfg.siteName)}</div><div class="sh-title">${esc(s.title)}<span class="sx-pg-label">${esc(p.label)}</span><small>${esc(s.sub)}</small></div></div><div class="sh-name">名前<span></span></div></div>${body}${footNote(cfg, s)}</div>`;
}

// A4の1ページにちょうど収まる大きさまで、文字や表を広げる（印刷・PDFのときだけ動く）
const FIT_JS = `(function(){document.body.style.width='192mm';var AV=Math.floor((297-16)/25.4*96);function fit(){document.querySelectorAll('.sx-pg').forEach(function(el){if(el.getAttribute('data-fixed'))return;var z=parseFloat(el.getAttribute('data-maxz'))||1.5;el.style.zoom=z;while(z>0.75&&el.getBoundingClientRect().height>AV*0.97){z=Math.round((z-0.02)*100)/100;el.style.zoom=z;}});}
window.__fit=fit;if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit);}else{window.addEventListener('load',fit);}})();`;

export function sheetPrintHtml(cfg, s) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${esc(s.title)}｜${esc(cfg.siteName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:8mm 9mm}html,body{margin:0;background:#fff}.sx-pg{break-after:page;page-break-after:always}.sx-pg:last-child{break-after:auto;page-break-after:auto}${SX_CSS}</style></head><body>${s.pages.map((p, i) => pageHtml(cfg, s, p, i, true)).join('')}<script>${FIT_JS}</script></body></html>`;
}

// ---------- サイトのページ ----------
const sheetCard = (base, s) => `<a class="mt-card" href="${base}/sheets/${s.id}.html"><b>${esc(s.title)}</b><span>${esc(s.sub)}</span></a>`;

export function sheetsIndexPage({ cfg, css, sheets, recent }) {
  const base = baseOf(cfg);
  const main = `<section class="hero hero-list"><div class="hero-tx"><h1>覚えるシート</h1><p class="lead">中学受験で、くり返し見る「基本の1枚」を集めました。時事のしくみから、算数の公式、年表、都道府県、漢字の部首まで。ページで見られて、A4に印刷もできます。</p></div></section>
${cfg.lineUrl ? `<div class="sx-line"><b>印刷用のPDF（A4・おもてとうら）をプレゼント</b><p>LINEの友だちになって、トークで「シート」と送ってください。すべてのシートのPDFをお送りします。</p><a class="btn btn-line" href="${esc(cfg.lineUrl)}" target="_blank" rel="noopener">LINEで受け取る</a></div>` : ''}
${GROUPS.map(([k, name, lead]) => {
    const xs = sheets.filter((s) => s.group === k);
    return xs.length ? `<h3 class="month">${esc(name)}</h3><p class="sx-gl">${esc(lead)}</p><div class="mt-cards">${xs.map((s) => sheetCard(base, s)).join('')}</div>` : '';
  }).join('')}
<p class="mt-note">※内容は、公的な資料や教科書の一般的な内容にもとづいて作っています。まちがいを見つけたら、お問い合わせから教えてください。</p>`;
  return layout({ cfg, css: css + SX_CSS + SITE_CSS, main, recent, title: `覚えるシート（時事・算数・社会・国語）｜印刷できるA4のまとめ｜${cfg.siteName}`, desc: '中学受験の基本を1枚にまとめた「覚えるシート」。憲法・三権・選挙、国連、環境、算数の単位と公式、日本の歴史年表、都道府県、漢字の部首。ページで見られて、A4に印刷もできます。', path: '/sheets/', ogImage: '/og/site.png' });
}

export function sheetPage({ cfg, css, s, sheets, recent }) {
  const base = baseOf(cfg);
  const others = sheets.filter((x) => x.id !== s.id);
  const main = `<nav class="crumb"><a href="${base}/">トップ</a><span>›</span><a href="${base}/sheets/">覚えるシート</a><span>›</span><span>${esc(s.title)}</span></nav>
<section class="hero hero-list"><div class="hero-tx"><h1>${esc(s.title)}</h1><p class="lead">${esc(s.intro)}</p><p class="mt-upd">${esc(s.subject)}　最終更新：${esc(jpDate(s.updated).label)}${s.asof ? `（${esc(s.asof)}の内容）` : ''}</p></div></section>
${cfg.lineUrl ? `<div class="sx-line"><b>印刷用のPDF（A4・おもてとうら）</b><p>LINEの友だちになって、トークで「シート」と送ると、PDFをお送りします。</p><a class="btn btn-line" href="${esc(cfg.lineUrl)}" target="_blank" rel="noopener">LINEで受け取る</a></div>` : ''}
<div class="sx sx-site">${s.pages.map((p, i) => pageHtml(cfg, s, p, i, false)).join('')}</div>
<p class="mt-note">家庭・塾・学校での印刷・配布は自由です（内容の改変・販売はご遠慮ください）。まちがいを見つけたら、お問い合わせから教えてください。</p>
<h3 class="month">ほかのシート</h3><div class="mt-cards">${others.map((x) => sheetCard(base, x)).join('')}</div>`;
  return layout({ cfg, css: css + SX_CSS + SITE_CSS, main, recent, title: `${plain(s.title)}｜覚えるシート｜${cfg.siteName}`, desc: s.intro, path: `/sheets/${s.id}.html`, ogImage: '/og/site.png' });
}

const SITE_CSS = `
.sx-line{border:2px dashed #1E9A72;border-radius:14px;padding:10px 14px;margin:0 0 16px;background:#F3FBF7}
.sx-line b{font-size:16px;font-weight:900}.sx-line p{margin:4px 0 8px;font-size:14px}.sx-line .btn{display:inline-block;padding:8px 22px}
.sx-gl{margin:-4px 0 10px;color:#56677F;font-size:14px}
.sx-site{background:#fff;border:2px solid #1D2B44;border-radius:12px;padding:6px 14px 14px;margin:0 0 18px}
.sx-site .sx-pg+.sx-pg{margin-top:10px}
`;
