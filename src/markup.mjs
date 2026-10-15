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

// AI が作った SVG を安全にして、ページ内で id がぶつからないようにする
export function safeSvg(svg = '', prefix = 'f') {
  let s = String(svg).trim();
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
