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

// 切り口の図で使う、立方体・円柱・円すいの土台
const cubeBase = () => poly([[38, 18], [90, 18], [68, 36], [16, 36]], FILL3) + poly([[16, 36], [68, 36], [68, 88], [16, 88]]) + poly([[68, 36], [90, 18], [90, 70], [68, 88]], FILL2)
  + `<path d="M16 88 L38 70 M38 70 L38 18 M38 70 L90 70" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`;
const cutPoly = (pts) => `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${ACC}" fill-opacity=".55" stroke="${ACC}" stroke-width="1.8" stroke-linejoin="round"/>`;
const cylBase = () => `<path d="M24 22 V70 A36 10 0 0 0 96 70 V22" fill="${FILL}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="60" cy="22" rx="36" ry="10" fill="${FILL3}" stroke="${INK}" stroke-width="1.6"/>`;
const coneBase = () => `<path d="M60 8 L24 74 A36 10 0 0 0 96 74 Z" fill="${FILL}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M24 74 A36 10 0 0 1 96 74" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`;

const LBL = (x, y, s, a = 'start') => T(x, y, s, { s: 9.5, a });
const lead = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="1" fill="none"/><circle cx="${x1}" cy="${y1}" r="1.5" fill="${INK}"/>`;

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
  // ---- 立体を切ったときの切り口（オレンジ色が切り口） ----
  cutCubeTri: () => wrap(cubeBase() + cutPoly([[16, 36], [68, 88], [90, 18]]), 120, 96),
  cutCubeRect: () => wrap(cubeBase() + cutPoly([[16, 36], [68, 36], [90, 70], [38, 70]]), 120, 96),
  cutCubeHex: () => wrap(poly([[60, 10], [90, 27], [60, 44], [30, 27]], FILL3) + poly([[30, 27], [60, 44], [60, 78], [30, 61]]) + poly([[60, 44], [90, 27], [90, 61], [60, 78]], FILL2) + cutPoly([[75, 18.5], [90, 44], [75, 69.5], [45, 69.5], [30, 44], [45, 18.5]]), 120, 96),
  cutCylCircle: () => wrap(cylBase() + `<ellipse cx="60" cy="46" rx="36" ry="10" fill="${ACC}" fill-opacity=".5" stroke="${ACC}" stroke-width="1.6"/>`, 120, 96),
  cutCylRect: () => wrap(cylBase() + `<polygon points="24,22 96,22 96,70 24,70" fill="${ACC}" fill-opacity=".45" stroke="${ACC}" stroke-width="1.6"/>`, 120, 96),
  cutCylEllipse: () => wrap(cylBase() + `<path d="M24 58 L96 34 A36 10 0 0 1 96 34 Z" fill="none"/><ellipse cx="60" cy="46" rx="38.6" ry="10" transform="rotate(-21.3 60 46)" fill="${ACC}" fill-opacity=".5" stroke="${ACC}" stroke-width="1.6"/>`, 120, 96),
  cutConeCircle: () => wrap(coneBase() + `<ellipse cx="60" cy="48" rx="21.8" ry="6.2" fill="${ACC}" fill-opacity=".55" stroke="${ACC}" stroke-width="1.6"/>`, 120, 96),
  cutConeTri: () => wrap(coneBase() + `<polygon points="60,8 24,74 96,74" fill="${ACC}" fill-opacity=".45" stroke="${ACC}" stroke-width="1.6" stroke-linejoin="round"/>`, 120, 96),
  cutSphere: () => wrap(`<circle cx="60" cy="48" r="38" fill="${FILL}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="60" cy="38" rx="36.6" ry="9.6" fill="${ACC}" fill-opacity=".5" stroke="${ACC}" stroke-width="1.6"/>`, 120, 96),
  // ---- 植物のつくり（部分の名前つき） ----
  flower: () => wrap(
    `<rect x="57" y="92" width="6" height="22" fill="#8FD19E" stroke="${INK}" stroke-width="1.4"/>`
    + `<path d="M60 82 C30 82 22 54 30 36 C42 44 56 60 60 82 Z" fill="#F7A8C4" stroke="${INK}" stroke-width="1.4"/><path d="M60 82 C90 82 98 54 90 36 C78 44 64 60 60 82 Z" fill="#F7A8C4" stroke="${INK}" stroke-width="1.4"/>`
    + `<path d="M52 76 L44 50 M68 76 L76 50" stroke="${INK}" stroke-width="1.6" fill="none"/><ellipse cx="43" cy="46" rx="4.5" ry="6.5" fill="#F6C945" stroke="${INK}" stroke-width="1.3"/><ellipse cx="77" cy="46" rx="4.5" ry="6.5" fill="#F6C945" stroke="${INK}" stroke-width="1.3"/>`
    + `<rect x="58.5" y="42" width="3" height="20" fill="#CFEFC8" stroke="${INK}" stroke-width="1.2"/><ellipse cx="60" cy="70" rx="10" ry="11" fill="#CFEFC8" stroke="${INK}" stroke-width="1.4"/><circle cx="60" cy="38" r="5" fill="#E5484D" stroke="${INK}" stroke-width="1.3"/>`
    + `<circle cx="56.5" cy="68" r="2.4" fill="#F6C945" stroke="${INK}" stroke-width="1"/><circle cx="63.5" cy="68" r="2.4" fill="#F6C945" stroke="${INK}" stroke-width="1"/><circle cx="60" cy="74" r="2.4" fill="#F6C945" stroke="${INK}" stroke-width="1"/>`
    + `<path d="M44 90 Q60 100 76 90 L72 82 L48 82 Z" fill="#8FD19E" stroke="${INK}" stroke-width="1.4"/>`
    + lead(65, 36, 102, 26) + LBL(104, 29, '柱頭') + lead(80, 44, 102, 46) + LBL(104, 49, 'やく') + lead(90, 62, 102, 66) + LBL(104, 69, '花びら')
    + lead(69, 72, 102, 86) + LBL(104, 89, '子房') + lead(74, 90, 102, 106) + LBL(104, 109, 'がく') + lead(56.5, 68, 22, 88) + LBL(4, 99, '胚珠', 'start'), 150, 118),
  seed: () => wrap(
    `<ellipse cx="72" cy="58" rx="46" ry="27" fill="#E9C48B" stroke="#8A5A2B" stroke-width="2"/><ellipse cx="72" cy="58" rx="41" ry="22" fill="#F3D9A4" stroke="#C9A06A" stroke-width="1.2" stroke-dasharray="3 2"/>`
    + `<path d="M40 64 L22 78 L42 72 Z" fill="#D9B27C" stroke="${INK}" stroke-width="1.3"/><path d="M40 62 Q50 58 58 60" stroke="#B8935E" stroke-width="5" stroke-linecap="round" fill="none"/>`
    + `<ellipse cx="52" cy="51" rx="5" ry="8" fill="#8FD19E" stroke="${INK}" stroke-width="1.2" transform="rotate(-15 52 51)"/><ellipse cx="59" cy="49" rx="4.5" ry="7.5" fill="#6FC184" stroke="${INK}" stroke-width="1.2" transform="rotate(12 59 49)"/>`
    + lead(55, 44, 55, 18) + LBL(55, 14, '幼芽', 'middle') + lead(48, 62, 40, 100) + LBL(40, 110, '胚軸', 'middle') + lead(26, 76, 12, 96) + LBL(4, 106, '幼根')
    + lead(112, 44, 124, 26) + LBL(124, 22, '種皮') + lead(96, 64, 120, 88) + LBL(122, 99, '子葉'), 150, 116),
  photo: () => wrap(
    `<circle cx="20" cy="20" r="9" fill="#F6C945" stroke="${INK}" stroke-width="1.4"/><path d="M20 6 V1 M20 34 V39 M6 20 H1 M34 20 H39 M10 10 L6 6 M30 10 L34 6 M10 30 L6 34" stroke="${ACC}" stroke-width="1.6" stroke-linecap="round"/>`
    + `<path d="M34 30 L62 50" stroke="${ACC}" stroke-width="1.8" stroke-dasharray="4 3" fill="none"/>` + `<path d="M58 44 L66 52 L55 52 Z" fill="${ACC}"/>` + LBL(44, 30, '光')
    + `<path d="M70 76 C66 50 90 34 122 36 C124 66 100 84 70 76 Z" fill="#8FD19E" stroke="${INK}" stroke-width="1.5"/><path d="M70 76 C86 62 100 50 114 42" stroke="${INK}" stroke-width="1.2" fill="none"/>`
    + `<path d="M8 64 L52 64" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M50 59 L60 64 L50 69 Z" fill="${INK}"/>` + LBL(4, 58, '二酸化炭素')
    + `<path d="M118 60 L142 70" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M138 64 L146 71 L136 73 Z" fill="${INK}"/>` + LBL(126, 56, '酸素')
    + `<rect x="68" y="80" width="5" height="24" fill="#8FD19E" stroke="${INK}" stroke-width="1.2"/><path d="M96 112 L96 92" stroke="#3B8FD9" stroke-width="2" fill="none"/><path d="M91 96 L96 88 L101 96 Z" fill="#3B8FD9"/>` + LBL(104, 106, '水')
    + T(96, 62, 'デンプン', { s: 9.5 }), 150, 118),
};

export function fig(spec) {
  if (!spec) return '';
  const [name, ...args] = spec;
  if (!G[name]) throw new Error(`図形「${name}」はありません`);
  return G[name](...args);
}
export const FIG_NAMES = Object.keys(G);
