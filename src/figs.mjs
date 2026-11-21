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
  flower: () => {
    const st = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
    return wrap(
      `<rect x="67" y="94" width="6" height="32" rx="2" fill="#8FD19E" ${st}/>`
      + `<path d="M70 92 C54 96 42 92 36 80 C50 82 62 86 70 88 Z" fill="#7CC48E" ${st}/><path d="M70 92 C86 96 98 92 104 80 C90 82 78 86 70 88 Z" fill="#7CC48E" ${st}/>`
      + `<path d="M68 88 C38 92 16 70 22 40 C24 28 36 28 40 36 C50 54 62 68 68 88 Z" fill="#F7A8C4" ${st}/><path d="M72 88 C102 92 124 70 118 40 C116 28 104 28 100 36 C90 54 78 68 72 88 Z" fill="#F7A8C4" ${st}/>`
      + `<path d="M62 80 C48 66 38 52 32 38 M78 80 C92 66 102 52 108 38" stroke="#E27AA0" stroke-width="1" fill="none" stroke-linecap="round"/>`
      + `<path d="M61 78 C52 68 50 58 52 48 M79 78 C88 68 90 58 88 48" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      + `<ellipse cx="52" cy="42" rx="4.8" ry="7.5" fill="#F6C945" ${st}/><ellipse cx="88" cy="42" rx="4.8" ry="7.5" fill="#F6C945" ${st}/>`
      + `<rect x="68.4" y="44" width="3.2" height="20" fill="#DFF3D6" ${st} stroke-width="1.2"/>`
      + `<ellipse cx="70" cy="76" rx="11.5" ry="14" fill="#DFF3D6" ${st}/>`
      + `<circle cx="66" cy="72" r="2.6" fill="#F6C945" stroke="${INK}" stroke-width="1"/><circle cx="74" cy="72" r="2.6" fill="#F6C945" stroke="${INK}" stroke-width="1"/><circle cx="70" cy="79" r="2.6" fill="#F6C945" stroke="${INK}" stroke-width="1"/>`
      + `<ellipse cx="70" cy="40" rx="6.5" ry="5.5" fill="#F0713A" ${st}/><circle cx="67" cy="38.5" r="1" fill="#fff"/><circle cx="72" cy="39.5" r="1" fill="#fff"/>`
      + lead(76, 38, 118, 30) + LBL(120, 33, '柱頭') + lead(92, 42, 118, 46) + LBL(120, 49, 'やく') + lead(112, 56, 118, 62) + LBL(120, 65, '花びら')
      + lead(80, 76, 118, 80) + LBL(120, 83, '子房') + lead(96, 86, 118, 98) + LBL(120, 101, 'がく') + lead(65, 73, 30, 98) + LBL(4, 108, '胚珠'), 160, 128);
  },
  seed: () => {
    const st = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
    return wrap(
      `<path d="M22 62 C18 36 48 24 84 26 C120 28 142 42 138 64 C134 86 104 96 74 94 C56 93 44 88 38 82 C32 86 24 80 22 62 Z" fill="#D9A55F" stroke="#7A4B1E" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="M30 62 C28 42 52 32 84 34 C114 36 132 46 130 64 C126 82 102 88 76 86 C60 85 48 80 42 74 C36 78 32 72 30 62 Z" fill="#F4DDA8" stroke="#C99A55" stroke-width="1.2" stroke-dasharray="3 2.5"/>`
      + `<path d="M92 44 C108 44 120 52 120 62" stroke="#E7C98C" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M42 70 C38 78 30 86 22 92 C32 92 42 88 48 80 Z" fill="#E2B987" ${st}/>`
      + `<path d="M44 70 C46 62 52 56 60 54" stroke="#C99A55" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M44 70 C46 62 52 56 60 54" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-dasharray="0.1 4"/>`
      + `<path d="M58 54 C50 46 52 34 62 30 C66 40 64 50 58 54 Z" fill="#8FD19E" ${st}/><path d="M60 54 C66 44 76 42 82 46 C78 54 70 58 60 54 Z" fill="#6FC184" ${st}/>`
      + lead(62, 32, 62, 12) + LBL(62, 10, '幼芽', 'middle') + lead(50, 62, 46, 104) + LBL(46, 114, '胚軸', 'middle') + lead(26, 88, 12, 106) + LBL(4, 116, '幼根')
      + lead(130, 52, 140, 30) + LBL(138, 24, '種皮') + lead(108, 70, 128, 94) + LBL(130, 106, '子葉'), 160, 122);
  },
  photo: () => {
    const st = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
    return wrap(
      `<rect x="0" y="100" width="170" height="30" fill="#D8B48A"/><path d="M0 100 Q20 96 40 100 T80 100 T120 100 T170 100" fill="none" stroke="#8A5A2B" stroke-width="1.6"/>`
      + `<path d="M90 102 C84 112 78 118 70 122 M90 102 V124 M90 102 C96 112 104 118 112 122" stroke="#8A5A2B" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      + `<path d="M90 102 V62" stroke="#4FA36A" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M90 70 C60 70 46 46 56 16 C86 20 112 42 90 70 Z" fill="#8FD19E" ${st}/><path d="M90 70 C80 52 70 36 60 22 M80 56 L70 52 M72 44 L64 42 M86 60 L96 52 M80 48 L90 40" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
      + `<path d="M92 76 C110 76 128 66 134 50 C118 48 100 58 92 76 Z" fill="#7CC48E" ${st} transform="translate(2 4)"/>`
      + `<circle cx="22" cy="22" r="11" fill="#F6C945" stroke="${INK}" stroke-width="1.4"/><path d="M22 6 V1 M22 38 V43 M6 22 H1 M38 22 H43 M10 10 L6 6 M34 10 L38 6 M10 34 L6 38" stroke="${ACC}" stroke-width="1.8" stroke-linecap="round"/>`
      + `<path d="M36 34 L54 44" stroke="${ACC}" stroke-width="2" stroke-dasharray="4 3" fill="none"/><path d="M52 38 L60 46 L49 47 Z" fill="${ACC}"/>` + LBL(36, 26, '光')
      + `<path d="M6 72 L46 62" stroke="${INK}" stroke-width="1.8" fill="none"/><path d="M44 57 L54 60 L45 67 Z" fill="${INK}"/>` + LBL(3, 54, '二酸化炭素')
      + `<path d="M104 36 L132 26" stroke="${INK}" stroke-width="1.8" fill="none"/><path d="M128 21 L138 25 L129 31 Z" fill="${INK}"/>` + LBL(124, 17, '酸素')
      + lead(82, 46, 122, 64) + LBL(124, 67, 'デンプン')
      + `<path d="M130 120 L112 108" stroke="#2F7BC8" stroke-width="2" fill="none"/><path d="M118 104 L108 105 L113 114 Z" fill="#2F7BC8"/>` + T(140, 118, '水', { s: 9.5, c: INK }), 170, 130);
  },
};

export function fig(spec) {
  if (!spec) return '';
  const [name, ...args] = spec;
  if (!G[name]) throw new Error(`図形「${name}」はありません`);
  return G[name](...args);
}
export const FIG_NAMES = Object.keys(G);
