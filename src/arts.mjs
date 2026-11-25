// 作りおきのイラスト部品。図の中に <art name="un" x="0" y="40" width="300"/> と書くと、ここで本物の絵に置きかわる
//   （AI に毎回ゼロから描かせると、丸や四角だけの雑な絵になりやすいので、よく出る題材は、品質をそろえた部品にしておく）
//   部品ごとの基準サイズ W×H があり、width だけ決めれば縦横比は保たれる。色は固定色（ダークモードでも見える色）。
const flag = (x, y, c) => `<path d="M${x} ${y + 26}V${y}" stroke="#7B8794" stroke-width="1.6"/><path d="M${x} ${y}h14v9h-14z" fill="${c}"/>`;
const grid = (x, y, w, h, dx, dy, c = '#fff', o = '.55') => {
  let s = '';
  for (let i = dy; i < h; i += dy) s += `M${x} ${y + i}h${w}`;
  for (let j = dx; j < w; j += dx) s += `M${x + j} ${y}v${h}`;
  return `<path d="${s}" stroke="${c}" stroke-width=".8" opacity="${o}" fill="none"/>`;
};
export const ARTS = {
  // 国連本部（ニューヨーク）：高い事務局ビルと、ひくい総会ビル、旗、イースト川
  un: { W: 300, H: 190, f: () => [
    '<defs><linearGradient id="unG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CFEAF9"/><stop offset=".5" stop-color="#8CC3E6"/><stop offset="1" stop-color="#6FA9D3"/></linearGradient>',
    '<linearGradient id="unW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BA8E6"/><stop offset="1" stop-color="#2E78C7"/></linearGradient></defs>',
    '<rect x="0" y="152" width="300" height="38" rx="4" fill="url(#unW)"/>',
    '<path d="M14 166q10-5 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0M30 180q10-5 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" stroke="#fff" stroke-width="1.3" fill="none" opacity=".55"/>',
    '<rect x="0" y="140" width="300" height="14" fill="#D9DEE5"/><path d="M0 146h300" stroke="#B7BFCA" stroke-width="1"/>',
    // 事務局ビル
    '<rect x="112" y="8" width="62" height="134" fill="url(#unG)" stroke="#3E5873" stroke-width="1.6"/>',
    grid(112, 8, 62, 134, 8.9, 8.4, '#fff', '.7'),
    '<path d="M174 8l30 10v122l-30 2z" fill="#4C84AE" stroke="#3E5873" stroke-width="1.6"/>',
    '<path d="M180 22v114M186 24v112M192 26v112M198 28v110" stroke="#9CC3DE" stroke-width="1" opacity=".6"/>',
    '<path d="M112 8l62 0l30 10l-62 0z" fill="#E7F3FB" stroke="#3E5873" stroke-width="1.4"/>',
    '<rect x="112" y="60" width="62" height="6" fill="#3E5873" opacity=".35"/><rect x="112" y="100" width="62" height="6" fill="#3E5873" opacity=".35"/>',
    // 総会ビル
    '<path d="M18 104q48-34 98 0v38H18z" fill="#EEF2F6" stroke="#3E5873" stroke-width="1.6" stroke-linejoin="round"/>',
    '<path d="M30 104q36-24 74 0" stroke="#B7C2CF" stroke-width="2" fill="none"/>',
    '<path d="M30 112h74v30H30z" fill="#B6DAF1" stroke="#3E5873" stroke-width="1.4"/>',
    grid(30, 112, 74, 30, 9.3, 7.5, '#3E5873', '.45'),
    '<circle cx="67" cy="96" r="9.5" fill="#4B92DB" stroke="#fff" stroke-width="1.6"/><circle cx="67" cy="96" r="5" fill="none" stroke="#fff" stroke-width="1"/><path d="M57.5 96h19M67 86.5v19" stroke="#fff" stroke-width=".8"/>',
    // 旗
    [140, 158, 176, 194, 212, 230, 248, 266].map((x, i) => flag(x, 118, ['#E5484D', '#2E78C7', '#F2C14E', '#3FA66B', '#fff', '#E5484D', '#2E78C7', '#F2994A'][i])).join(''),
  ].join('') },
  // 人（会議・国民などのたとえ）。color=服の色
  person: { W: 60, H: 80, f: (a) => {
    const c = a.color || '#2E78C7';
    return `<defs><linearGradient id="pG${c.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".78"/></linearGradient></defs>`
      + `<path d="M6 80q0-30 24-30t24 30z" fill="url(#pG${c.slice(1)})" stroke="rgba(0,0,0,.28)" stroke-width="1.4"/>`
      + '<path d="M24 52l6 12l6-12" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width="1"/>'
      + '<rect x="26" y="40" width="8" height="12" rx="3" fill="#F2C9A5"/>'
      + '<circle cx="30" cy="28" r="14" fill="#F8D7B4" stroke="rgba(0,0,0,.28)" stroke-width="1.4"/>'
      + '<path d="M16 26q1-16 14-16t14 16q-8-8-14-8t-14 8z" fill="#3B2F2A"/>'
      + '<circle cx="25" cy="29" r="1.6" fill="#3B2F2A"/><circle cx="35" cy="29" r="1.6" fill="#3B2F2A"/><path d="M26 35q4 3 8 0" stroke="#A0614B" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  } },
  // 国会議事堂（東京）
  diet: { W: 300, H: 170, f: () => [
    '<defs><linearGradient id="dtG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3EFE4"/><stop offset="1" stop-color="#D8D1BE"/></linearGradient></defs>',
    '<rect x="0" y="148" width="300" height="22" fill="#7DBE82"/><path d="M0 150h300" stroke="#5C9F63" stroke-width="2"/>',
    '<rect x="20" y="98" width="260" height="52" fill="url(#dtG)" stroke="#8A8468" stroke-width="1.6"/>',
    [26, 70, 190, 234].map((x) => `<rect x="${x}" y="108" width="40" height="42" fill="#EAE4D2" stroke="#8A8468" stroke-width="1.2"/>` + [0, 1, 2, 3].map((i) => `<rect x="${x + 4 + i * 9}" y="114" width="5.5" height="26" fill="#9DB4C8" stroke="#8A8468" stroke-width=".8"/>`).join('')).join(''),
    '<rect x="112" y="70" width="76" height="80" fill="url(#dtG)" stroke="#8A8468" stroke-width="1.6"/>',
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${118 + i * 11.6}" y="104" width="7" height="46" fill="#EAE4D2" stroke="#8A8468" stroke-width="1"/>`).join(''),
    '<path d="M118 70v-14h64v14" fill="#E9E3D0" stroke="#8A8468" stroke-width="1.5"/>',
    '<path d="M124 56l8-12h36l8 12z" fill="#CFC8B1" stroke="#8A8468" stroke-width="1.4"/>',
    '<path d="M134 44l5-10h22l5 10z" fill="#C2BAA2" stroke="#8A8468" stroke-width="1.4"/>',
    '<path d="M142 34l8-14l8 14z" fill="#B3AB93" stroke="#8A8468" stroke-width="1.4"/><path d="M150 20v-8" stroke="#8A8468" stroke-width="2"/>',
    '<path d="M110 70h80M116 84h68" stroke="#8A8468" stroke-width="1" opacity=".6"/>',
    '<rect x="20" y="96" width="260" height="5" fill="#B3AB93"/>',
  ].join('') },
};
const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
export function expandArts(svg = '') {
  return String(svg).replace(/<art\b([^>]*?)\/?>(\s*<\/art>)?/gi, (_, attrs) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => [m[1].toLowerCase(), m[2] ?? m[3]]));
    const art = ARTS[a.name];
    if (!art) return '';
    const x = num(a.x, 0), y = num(a.y, 0), w = num(a.width, art.W), h = +(w * art.H / art.W).toFixed(1);
    return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${art.W} ${art.H}" overflow="visible" aria-hidden="true">${art.f(a)}</svg>`;
  });
}
