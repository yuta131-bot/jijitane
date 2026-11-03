// 図形のイラスト（SVG）。覚えるシートの公式と、確認テストの問題に使う。
// fig(['tri', 8, 5]) → 底辺8cm・高さ5cmの三角形。数字を null にすると「底辺」「高さ」などのことばが入る
const INK = '#1D2B44';
const FILL = '#EAF3FB';
const FILL2 = '#D5E6F5';
const FILL3 = '#F6FAFD';
const ACC = '#DB7420';
const L = (v, word, unit = 'cm') => (v == null ? word : typeof v === 'string' ? v : `${v}${unit}`);
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" font-size="${o.s || 9.5}" font-weight="700" fill="${o.c || INK}">${s}</text>`;
const line = (x1, y1, x2, y2, dash = true, c = ACC) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.4"${dash ? ' stroke-dasharray="3 2.5"' : ''}/>`;
const rightAngle = (x, y, dx = 1, dy = -1) => `<path d="M${x + dx * 6} ${y} L${x + dx * 6} ${y + dy * 6} L${x} ${y + dy * 6}" fill="none" stroke="${ACC}" stroke-width="1.2"/>`;
const poly = (pts, fill = FILL) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
const wrap = (inner, w = 120, h = 96) => `<svg class="sx-fig" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">${inner}</svg>`;

const G = {
  // 三角形：底辺・高さ
  tri: (b, h) => wrap(
    poly([[10, 76], [100, 76], [40, 14]]) + line(40, 14, 40, 76) + rightAngle(40, 76, 1, -1)
    + T(55, 91, L(b, '底辺')) + T(44, 49, L(h, '高さ'), { a: 'start' })),
  // 平行四辺形
  para: (b, h) => wrap(
    poly([[24, 76], [104, 76], [84, 14], [4, 14]]) + line(84, 14, 84, 76) + rightAngle(84, 76, -1, -1)
    + T(64, 91, L(b, '底辺')) + T(88, 49, L(h, '高さ'), { a: 'start' })),
  // 台形
  trap: (a, b, h) => wrap(
    poly([[8, 76], [108, 76], [82, 16], [36, 16]]) + line(36, 16, 36, 76) + rightAngle(36, 76, 1, -1)
    + T(59, 11, L(a, '上底')) + T(58, 91, L(b, '下底')) + T(40, 50, L(h, '高さ'), { a: 'start' })),
  // ひし形：対角線
  rhombus: (p, q) => wrap(
    poly([[8, 46], [60, 10], [112, 46], [60, 82]]) + line(8, 46, 112, 46) + line(60, 10, 60, 82)
    + T(34, 42, L(p, '対角線')) + T(96, 66, L(q, '対角線'), { a: 'middle' })),
  // 円：半径
  circle: (r) => wrap(
    `<circle cx="60" cy="48" r="38" fill="${FILL}" stroke="${INK}" stroke-width="1.6"/>` + line(60, 48, 98, 48, false) + `<circle cx="60" cy="48" r="2" fill="${INK}"/>`
    + T(80, 43, L(r, '半径'))),
  // おうぎ形：半径・中心角
  sector: (r, deg = 90, word = false) => {
    const R = 62, cx = 28, cy = 80, th = (deg * Math.PI) / 180;
    const x2 = cx + R * Math.cos(th), y2 = cy - R * Math.sin(th);
    const big = deg > 180 ? 1 : 0;
    return wrap(
      `<path d="M${cx} ${cy} L${cx + R} ${cy} A${R} ${R} 0 ${big} 0 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${FILL}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`
      + T(cx + R / 2, cy + 12, L(r, '半径')) + T(cx + 20, cy - 8, word ? '中心角' : `${deg}°`, { a: 'start', s: 9 }));
  },
  // 直方体（立方体は a=b=c）：たて・横・高さ
  cuboid: (w, d, h) => wrap(
    `<g transform="translate(20 0)">` + poly([[10, 40], [34, 16], [102, 16], [78, 40]], FILL3) + poly([[10, 40], [78, 40], [78, 84], [10, 84]]) + poly([[78, 40], [102, 16], [102, 60], [78, 84]], FILL2) + `</g>`
    + T(64, 95, L(w, '横')) + T(26, 66, L(h, '高さ'), { a: 'end' }) + T(112, 12, L(d, 'たて'), { a: 'middle' }), 140, 100),
  // 円柱：半径・高さ
  cylinder: (r, h) => wrap(
    `<path d="M24 22 V70 A36 10 0 0 0 96 70 V22" fill="${FILL}" stroke="${INK}" stroke-width="1.6"/>`
    + `<ellipse cx="60" cy="22" rx="36" ry="10" fill="${FILL3}" stroke="${INK}" stroke-width="1.6"/>`
    + line(60, 22, 96, 22, false) + `<circle cx="60" cy="22" r="1.8" fill="${INK}"/>` + T(78, 17, L(r, '半径'), { s: 8.5 })
    + line(104, 22, 104, 70, false, INK) + T(106, 49, L(h, '高さ'), { a: 'start' }), 136, 96),
  // 円すい：半径・高さ
  cone: (r, h) => wrap(
    `<path d="M60 8 L24 74 A36 10 0 0 0 96 74 Z" fill="${FILL}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M24 74 A36 10 0 0 1 96 74" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`
    + line(60, 8, 60, 74) + line(60, 74, 96, 74, false) + `<circle cx="60" cy="74" r="1.8" fill="${INK}"/>`
    + T(64, 44, L(h, '高さ'), { a: 'start' }) + T(79, 89, L(r, '半径'), { s: 8.5 }), 120, 96),
  // 四角すい
  pyramid: (h) => wrap(
    poly([[20, 78], [76, 78], [102, 60], [46, 60]], FILL3) + `<path d="M60 8 L20 78 M60 8 L76 78 M60 8 L102 60" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M60 8 L46 60 L102 60" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`
    + line(60, 8, 60, 70) + T(64, 40, L(h, '高さ'), { a: 'start' }), 120, 90),
  // 球：半径
  sphere: (r) => wrap(
    `<circle cx="60" cy="48" r="38" fill="${FILL}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="60" cy="48" rx="38" ry="10" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`
    + line(60, 48, 98, 48, false) + T(80, 43, L(r, '半径'))),
  // 三角形の角度：3つの角（数字か「あ」「？」のような文字）
  triang: (a, b, c) => {
    const f = (v) => (typeof v === 'number' ? `${v}°` : v);
    return wrap(poly([[12, 76], [108, 76], [74, 16]]) + T(26, 70, f(a), { s: 9 }) + T(94, 70, f(b), { s: 9 }) + T(74, 36, f(c), { s: 9 }));
  },
  // 正六角形（内角120°）
  hexagon: () => wrap(poly([[34, 12], [86, 12], [112, 48], [86, 84], [34, 84], [8, 48]]) + T(60, 52, '正六角形', { s: 9.5 })),
  // 正方形
  square: (a) => wrap(poly([[36, 10], [102, 10], [102, 76], [36, 76]]) + T(69, 90, L(a, '1辺')) + T(32, 46, L(a, '1辺'), { a: 'end' })),
  // 長方形
  rect: (w, h) => wrap(poly([[30, 18], [112, 18], [112, 70], [30, 70]]) + T(71, 86, L(w, '横')) + T(26, 48, L(h, 'たて'), { a: 'end' })),
};

export function fig(spec) {
  if (!spec) return '';
  const [name, ...args] = spec;
  if (!G[name]) throw new Error(`図形「${name}」はありません`);
  return G[name](...args);
}
export const FIG_NAMES = Object.keys(G);
