import fs from 'node:fs';
// 記事テキストの簡易記法を HTML に変換する
//   {漢字|よみ}  → ふりがな
//   ==文字==     → 蛍光ペン
//   **文字**     → 太字
export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let SAY = new Set();
export const setSayKeys = (k) => { SAY = k; };

export function inline(s = '') {
  return esc(s)
    .replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, k, y) => `<ruby${SAY.has(`${k}|${y}`) ? ' data-say' : ''}>${k}<rt>${y}</rt></ruby>`)
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

// ふりがな・記号を外したプレーンテキスト（title や SNS 用）
export function plain(s = '') {
  return String(s)
    .replace(/\{([^{}|]+)\|[^{}|]+\}/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}

// 正確な海岸線のベースマップ（tools/make-basemaps.py で Natural Earth から作成）
//   図の中に <basemap name="typhoon" x="0" y="40" width="360"/> と書くと、ここで地図に置きかわる
export const BASEMAPS = JSON.parse(fs.readFileSync(new URL('./basemaps.json', import.meta.url), 'utf8'));
const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
export function expandBasemaps(svg = '') {
  return String(svg).replace(/<basemap\b([^>]*?)\/?>(\s*<\/basemap>)?/gi, (_, attrs) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)\s*=\s*"([^"]*)"/gi)].map((m) => [m[1].toLowerCase(), m[2]]));
    const m = BASEMAPS[a.name];
    if (!m) return '';
    const x = num(a.x, 0), y = num(a.y, 0), w = num(a.width, m.W), h = +(w * m.H / m.W).toFixed(1);
    return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${m.W} ${m.H}" overflow="hidden" aria-hidden="true">`
      + `<rect width="${m.W}" height="${m.H}" style="fill:var(--sea)"/>`
      + `<path d="${m.d}" style="fill:var(--land);stroke:var(--landline)" stroke-width="${(0.8 * m.W / w).toFixed(2)}" stroke-linejoin="round"/></svg>`;
  });
}

// AI が作った SVG を安全にして、ページ内で id がぶつからないようにする
export function safeSvg(svg = '', prefix = 'f') {
  let s = expandBasemaps(String(svg).trim());
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return '';
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href\s*=\s*)("|')\s*(?!#)[^"']*\2/gi, '')
    .replace(/<image[\s\S]*?>/gi, '');
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    const re = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s
      .replace(new RegExp(`id="${re(id)}"`, 'g'), `id="${prefix}-${id}"`)
      .replace(new RegExp(`url\\(#${re(id)}\\)`, 'g'), `url(#${prefix}-${id})`)
      .replace(new RegExp(`href="#${re(id)}"`, 'g'), `href="#${prefix}-${id}"`);
  }
  return s;
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];
export function jpDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { y, m, d, wd, label: `${y}年${m}月${d}日（${wd}）`, short: `${m}月${d}日（${wd}）` };
}

export function todayJst(offsetDays = 0) {
  const t = new Date(Date.now() + 9 * 3600e3 + offsetDays * 86400e3);
  return t.toISOString().slice(0, 10);
}
export function hourJst() {
  return new Date(Date.now() + 9 * 3600e3).getUTCHours();
}
