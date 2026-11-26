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

  // ロケット（打ち上げ中）。炎つき
  rocket: { W: 120, H: 270, f: () => [
    '<defs><linearGradient id="rkB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C5CED8"/><stop offset=".38" stop-color="#fff"/><stop offset="1" stop-color="#AEB9C6"/></linearGradient>',
    '<linearGradient id="rkF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4C2"/><stop offset=".5" stop-color="#FFB52E"/><stop offset="1" stop-color="#E8451E" stop-opacity="0"/></linearGradient></defs>',
    '<path d="M34 196v-56q8-26 16-20v76zM86 196v-56q-8-26-16-20v76z" fill="url(#rkB)" stroke="#8A94A3" stroke-width="1.4"/>',
    '<path d="M60 4C74 24 80 50 80 84v118H40V84C40 50 46 24 60 4z" fill="url(#rkB)" stroke="#8A94A3" stroke-width="1.6"/>',
    '<path d="M52 18C47 38 46 60 46 84" stroke="#fff" stroke-width="3" opacity=".8" fill="none" stroke-linecap="round"/>',
    '<rect x="40" y="84" width="40" height="6" fill="#3A4352"/><rect x="40" y="150" width="40" height="7" fill="#E8742A"/><path d="M40 118h40M40 176h40" stroke="#B4BEC9" stroke-width="1"/>',
    '<circle cx="60" cy="104" r="6.5" fill="#6FA9D3" stroke="#3A4352" stroke-width="1.6"/>',
    '<path d="M34 196l-8 14h16zM86 196l8 14H78z" fill="#4B5563"/><path d="M48 202l-4 14h32l-4-14z" fill="#4B5563"/>',
    '<path d="M44 216Q60 276 76 216z" fill="url(#rkF)"/><path d="M52 216Q60 252 68 216z" fill="#FFF4C2" opacity=".95"/>',
    '<path d="M28 210q6 36 12 4zM92 210q-6 36-12 4z" fill="url(#rkF)"/>',
  ].join('') },
  // 人工衛星・探査機（太陽電池パネルとパラボラアンテナ）
  satellite: { W: 240, H: 140, f: () => [
    '<defs><linearGradient id="stP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3C79D6"/><stop offset="1" stop-color="#1D3F8C"/></linearGradient>',
    '<linearGradient id="stB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6D77A"/><stop offset="1" stop-color="#C79A2B"/></linearGradient></defs>',
    '<path d="M120 70h-18M120 70h18" stroke="#8892A6" stroke-width="3"/>',
    '<rect x="6" y="38" width="94" height="64" rx="3" fill="url(#stP)" stroke="#A9C6FF" stroke-width="1.6"/>', grid(6, 38, 94, 64, 15.6, 16, '#A9C6FF', '.8'),
    '<rect x="140" y="38" width="94" height="64" rx="3" fill="url(#stP)" stroke="#A9C6FF" stroke-width="1.6"/>', grid(140, 38, 94, 64, 15.6, 16, '#A9C6FF', '.8'),
    '<rect x="98" y="46" width="44" height="48" rx="5" fill="url(#stB)" stroke="#8A6A1A" stroke-width="1.6"/>',
    '<path d="M104 58h32M104 70h32M104 82h32" stroke="#8A6A1A" stroke-width="1" opacity=".55"/>',
    '<path d="M120 46v-14" stroke="#8892A6" stroke-width="2.4"/><path d="M104 22q16-16 32 0q-16 8-32 0z" fill="#E8ECF4" stroke="#8892A6" stroke-width="1.4"/><circle cx="120" cy="32" r="2.6" fill="#E5484D"/>',
    '<path d="M120 94v10" stroke="#8892A6" stroke-width="2.4"/><rect x="112" y="104" width="16" height="8" rx="2" fill="#4B5563"/>',
  ].join('') },
  // 地震：地下の層、震源、ゆれの波、ゆれる家
  quake: { W: 300, H: 180, f: () => [
    '<defs><linearGradient id="qkS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A06A"/><stop offset=".5" stop-color="#A9794A"/><stop offset="1" stop-color="#7A5233"/></linearGradient></defs>',
    '<rect x="0" y="72" width="300" height="108" rx="8" fill="url(#qkS)"/>',
    '<path d="M0 100q60-8 130 2t170-4M0 132q80 8 150-2t150 6" stroke="#5C3B22" stroke-width="2" opacity=".5" fill="none"/>',
    '<rect x="0" y="62" width="300" height="12" rx="4" fill="#6FBF73"/>',
    '<path d="M162 74l-18 30l14 4l-14 22" stroke="#2B1A10" stroke-width="3" fill="none" stroke-linejoin="round"/>',
    '<g fill="none" stroke="#E5484D" stroke-width="2.4" opacity=".85"><circle cx="144" cy="130" r="12"/><circle cx="144" cy="130" r="26" opacity=".7"/><circle cx="144" cy="130" r="38" opacity=".5"/><circle cx="144" cy="130" r="48" opacity=".3"/></g>',
    '<path d="M144 120l3.5 8l8.5 .6l-6.5 5.6l2 8.4l-7.5-4.5l-7.5 4.5l2-8.4l-6.5-5.6l8.5-.6z" fill="#F2C14E" stroke="#B8860B" stroke-width="1.2"/>',
    // 家（ゆれる）
    '<g stroke="#5A4636" stroke-width="1.4"><rect x="40" y="36" width="34" height="26" fill="#F3E3C6"/><path d="M36 36l21-18l21 18z" fill="#C9573A"/><rect x="52" y="44" width="10" height="18" fill="#8A6A4A"/></g>',
    '<g stroke="#5A4636" stroke-width="1.4" transform="rotate(5 232 62)"><rect x="214" y="30" width="38" height="32" fill="#E4EEF6"/><path d="M210 30l23-20l23 20z" fill="#5B7DB1"/><rect x="226" y="42" width="11" height="20" fill="#8A6A4A"/></g>',
    '<path d="M28 30q-6 8 0 16M20 26q-8 12 0 24M270 34q6 8 0 16M280 28q8 12 0 24" stroke="#E5484D" stroke-width="2" fill="none" stroke-linecap="round"/>',
  ].join('') },
  // 台風：うずまく雲と目（うずは計算で描く）
  typhoon: { W: 200, H: 200, f: () => {
    const arm = (k, w, o) => {
      let d = '';
      for (let s = 0; s <= 40; s++) { const u = s / 40, r = 20 + 74 * u, th = k * 2.0944 + u * 4.4; d += `${s ? 'L' : 'M'}${(100 + r * Math.cos(th)).toFixed(1)} ${(100 + r * Math.sin(th)).toFixed(1)}`; }
      return `<path d="${d}" stroke="#fff" stroke-width="${w}" opacity="${o}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    return '<defs><radialGradient id="tyO" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3A7CC2"/><stop offset="1" stop-color="#1E4F8C"/></radialGradient>'
      + '<radialGradient id="tyE" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1B4A82"/><stop offset="1" stop-color="#6AA3DA"/></radialGradient></defs>'
      + '<circle cx="100" cy="100" r="96" fill="url(#tyO)"/>'
      + '<circle cx="100" cy="100" r="40" fill="#fff" opacity=".7"/>'
      + [0, 1, 2].map((k) => arm(k, 20, 0.88)).join('') + [0, 1, 2].map((k) => arm(k + 0.5, 9, 0.55)).join('')
      + '<circle cx="100" cy="100" r="13" fill="url(#tyE)" stroke="#fff" stroke-width="2.4"/>';
  } },
  // 原子力発電所：ドーム型の原子炉建屋、タービン建屋、煙突、海
  nuclear: { W: 300, H: 180, f: () => [
    '<defs><linearGradient id="nuW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BA8E6"/><stop offset="1" stop-color="#2E78C7"/></linearGradient>',
    '<linearGradient id="nuD" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F2F4F7"/><stop offset="1" stop-color="#C5CDD8"/></linearGradient></defs>',
    '<rect x="0" y="146" width="300" height="34" rx="4" fill="url(#nuW)"/><path d="M12 160q10-5 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0M40 172q10-5 20 0t20 0t20 0t20 0t20 0t20 0" stroke="#fff" stroke-width="1.3" fill="none" opacity=".5"/>',
    '<rect x="0" y="130" width="300" height="18" fill="#D9DEE5"/>',
    '<rect x="150" y="62" width="100" height="70" fill="url(#nuD)" stroke="#7B8794" stroke-width="1.6"/>', grid(150, 62, 100, 70, 25, 14, '#7B8794', '.35'),
    '<path d="M70 132v-48a40 40 0 0 1 80 0v48z" fill="url(#nuD)" stroke="#7B8794" stroke-width="1.6"/>',
    '<path d="M70 96h80M70 112h80" stroke="#7B8794" stroke-width="1" opacity=".5"/><path d="M84 132v-36M110 132v-60M136 132v-36" stroke="#7B8794" stroke-width="1" opacity=".35"/>',
    '<rect x="262" y="26" width="10" height="106" fill="#E5484D"/><rect x="262" y="26" width="10" height="14" fill="#fff"/><rect x="262" y="54" width="10" height="14" fill="#fff"/><rect x="262" y="82" width="10" height="14" fill="#fff"/><rect x="260" y="22" width="14" height="6" fill="#7B8794"/>',
    '<path d="M268 20q-4-10 8-16q-2 10-8 16" fill="#E9E6EC" opacity=".9"/>',
    '<rect x="176" y="50" width="48" height="14" fill="#EAF0F6" stroke="#7B8794" stroke-width="1.4"/>',
  ].join('') },

  // 防護服を着た人（医療・検査の訓練など）
  ppe: { W: 100, H: 170, f: () => {
    const S = '#F7F8FA', L = '#9AA5B8';
    return [
      `<rect x="30" y="108" width="18" height="48" rx="7" fill="${S}" stroke="${L}" stroke-width="1.8"/><rect x="52" y="108" width="18" height="48" rx="7" fill="${S}" stroke="${L}" stroke-width="1.8"/>`,
      '<rect x="30" y="146" width="18" height="4" fill="#F2994A"/><rect x="52" y="146" width="18" height="4" fill="#F2994A"/>',
      `<path d="M28 154h22v10q0 5-5 5H31q-5 0-5-5v-6q0-4 2-4zM50 154h22q2 0 2 4v6q0 5-5 5H55q-5 0-5-5z" fill="#9FD0B0" stroke="#5F8F70" stroke-width="1.5" stroke-linejoin="round"/>`,
      `<path d="M26 62Q50 52 74 62L80 114H20z" fill="${S}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>`,
      `<path d="M50 62V114" stroke="${L}" stroke-width="1.6" stroke-dasharray="3 2.5"/><path d="M34 68q-4 20-3 44M66 68q4 20 3 44" stroke="#DDE2E9" stroke-width="1.2" fill="none"/>`,
      `<path d="M26 64Q8 74 5 108l15 2Q23 86 34 72z" fill="${S}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/><path d="M74 64Q92 74 95 108l-15 2Q77 86 66 72z" fill="${S}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>`,
      '<rect x="4" y="103" width="17" height="5" fill="#F2994A"/><rect x="79" y="103" width="17" height="5" fill="#F2994A"/>',
      '<ellipse cx="12" cy="118" rx="9.5" ry="11" fill="#3B6FE0" stroke="#27479B" stroke-width="1.4"/><ellipse cx="88" cy="118" rx="9.5" ry="11" fill="#3B6FE0" stroke="#27479B" stroke-width="1.4"/>',
      `<path d="M22 58Q22 50 30 48Q50 56 70 48Q78 50 78 58Q50 66 22 58z" fill="${S}" stroke="${L}" stroke-width="1.6"/>`,
      `<ellipse cx="50" cy="30" rx="28" ry="30" fill="${S}" stroke="${L}" stroke-width="1.8"/>`,
      '<ellipse cx="50" cy="33" rx="17" ry="20" fill="#F6D3B0" stroke="#C9A58A" stroke-width="1.4"/>',
      '<rect x="33" y="24" width="34" height="12" rx="6" fill="#D6EDF9" stroke="#3B6FE0" stroke-width="2"/><path d="M38 28q4-3 10-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/><circle cx="43" cy="31" r="1.6" fill="#3A2F2A"/><circle cx="57" cy="31" r="1.6" fill="#3A2F2A"/>',
      '<path d="M35 38h30q2 0 2 3v6q0 6-17 7q-17-1-17-7v-6q0-3 2-3z" fill="#E3F1FA" stroke="#8FB5CC" stroke-width="1.4"/><path d="M38 42h24M38 47h24" stroke="#B9D6E8" stroke-width="1"/>',
      `<path d="M26 26Q28 6 50 4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
    ].join('');
  } },
  // エボラウイルス（ひも状）
  filovirus: { W: 120, H: 100, f: () => [
    '<defs><linearGradient id="fvG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C79BF2"/><stop offset="1" stop-color="#7A4FB8"/></linearGradient></defs>',
    '<path d="M14 80C20 30 54 16 68 36C82 56 54 76 54 56C54 40 74 36 86 46C100 58 102 72 110 64" fill="none" stroke="#5B3590" stroke-width="13" stroke-linecap="round"/>',
    '<path d="M14 80C20 30 54 16 68 36C82 56 54 76 54 56C54 40 74 36 86 46C100 58 102 72 110 64" fill="none" stroke="url(#fvG)" stroke-width="9" stroke-linecap="round"/>',
    '<path d="M18 70C24 38 50 24 62 36" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>',
  ].join('') },
  rover: { W: 240, H: 135, f: () => {
    let wh = '';
    [92, 140, 188].forEach((x) => {
      wh += `<circle cx="${x}" cy="110" r="14" fill="#3B3D45"/><circle cx="${x}" cy="110" r="11.5" fill="none" stroke="#25262C" stroke-width="2" stroke-dasharray="3 2.2"/>`
        + `<circle cx="${x}" cy="110" r="5.5" fill="#B4B8C4"/><path d="M${x - 5} ${110}H${x + 5}M${x} ${105}V${115}" stroke="#7D8190" stroke-width="1.2"/>`;
    });
    let cell = '';
    [123, 144, 165].forEach((x) => { cell += `<path d="M${x} 38L${x - 3} 62" stroke="#9FC0F0" stroke-width="1"/>`; });
    return [
      '<ellipse cx="136" cy="125" rx="86" ry="5" fill="#000" opacity=".28"/>',
      // ドリルが入った穴
      '<ellipse cx="31" cy="124.5" rx="11" ry="3.2" fill="#575967"/>',
      // 足まわり（ロッカー・ボギー）
      '<path d="M110 88L92 110M110 88L140 110M172 88L188 110M172 88L140 110" stroke="#B9BDC9" stroke-width="3.6" stroke-linecap="round" fill="none"/>', wh,
      // 本体
      '<rect x="78" y="62" width="124" height="28" rx="7" fill="#ECEEF4" stroke="#9AA0B0" stroke-width="1.5"/>',
      '<rect x="88" y="70" width="26" height="10" rx="2" fill="#5B7DB1"/><rect x="152" y="70" width="38" height="10" rx="2" fill="#E7B85A"/><path d="M122 68V84M130 68V84M138 68V84" stroke="#B8BDCB" stroke-width="1.6"/>',
      // 太陽電池
      '<path d="M104 62L110 50M170 62L164 50" stroke="#9AA0B0" stroke-width="2"/>',
      '<polygon points="92,52 102,36 172,36 182,52" fill="#2D5FA8" stroke="#9FC0F0" stroke-width="1.5"/>', cell, '<path d="M97 44H177" stroke="#9FC0F0" stroke-width="1"/>',
      // マスト＋カメラ
      '<rect x="188" y="22" width="5" height="40" fill="#ECEEF4"/><rect x="180" y="12" width="21" height="11" rx="2.5" fill="#ECEEF4" stroke="#9AA0B0" stroke-width="1"/><circle cx="190.5" cy="17.5" r="3.4" fill="#333"/>',
      // ドリルのうで＋ドリル（地面に刺さる）
      '<path d="M80 74L32 84" stroke="#ECEEF4" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="74" r="3.2" fill="#9AA0B0"/>',
      '<rect x="26" y="82" width="10" height="34" rx="1.5" fill="#C9CCD6" stroke="#9AA0B0" stroke-width="1"/><path d="M26 98H36M26 106H36" stroke="#9AA0B0" stroke-width="1"/>',
      '<polygon points="26,116 36,116 31,127" fill="#F2B441"/>',
      // ほった砂・舞う砂
      '<ellipse cx="21" cy="124" rx="8" ry="2.6" fill="#C2C4CE"/><ellipse cx="42" cy="125" rx="7" ry="2.2" fill="#B5B7C2"/><circle cx="16" cy="117" r="1.6" fill="#D7D8E0"/><circle cx="45" cy="118" r="1.3" fill="#D7D8E0"/><circle cx="12" cy="121" r="1.1" fill="#D7D8E0"/>',
    ].join('');
  } },
  ship: { W: 300, H: 118, f: () => {
    const wave = (y, a) => { let d = `M0 ${y}`; d += ` Q12 ${y - a} 25 ${y}`; for (let i = 1; i < 12; i++) d += ` T${25 * (i + 1)} ${y}`; return d; };
    const cols = ['#E5484D', '#F2B441', '#3E9B6E', '#5B7DB1', '#E8833A', '#8E6BBF'];
    const heights = [3, 2, 3, 2];
    let box = '';
    heights.forEach((n, i) => {
      for (let r = 0; r < n; r++) {
        const x = 98 + i * 38, y = 56 - r * 15, c = cols[(i * 2 + r * 3) % cols.length];
        box += `<rect x="${x}" y="${y}" width="36" height="14" rx="1.5" fill="${c}"/>`
          + `<path d="M${x + 9} ${y + 1}V${y + 13}M${x + 18} ${y + 1}V${y + 13}M${x + 27} ${y + 1}V${y + 13}" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/>`
          + `<rect x="${x}" y="${y}" width="36" height="2.4" rx="1" fill="#fff" opacity=".35"/>`;
      }
    });
    let win = '';
    [42, 52, 62].forEach((y) => { for (let i = 0; i < 5; i++) win += `<rect x="${34 + i * 8}" y="${y}" width="6" height="5" rx="1" fill="#6FB4E3"/>`; });
    return [
      // 煙
      '<circle cx="70" cy="9" r="5" fill="#fff" opacity=".85"/><circle cx="79" cy="3" r="4" fill="#fff" opacity=".7"/>',
      // 船体（水面より下までのびる）
      '<path d="M8 70H286Q293 70 291 78L279 102H22Q10 102 8 90Z" fill="#2F4A66"/>',
      '<path d="M8 90H284L279 102H22Q10 102 8 90Z" fill="#C94A4A"/>',
      '<rect x="8" y="68" width="279" height="4" rx="1" fill="#E5484D"/><path d="M10 78H289" stroke="#fff" stroke-width="2" opacity=".5"/>',
      '<circle cx="40" cy="83" r="2.2" fill="#9FC9EC"/><circle cx="54" cy="83" r="2.2" fill="#9FC9EC"/><circle cx="68" cy="83" r="2.2" fill="#9FC9EC"/>',
      // 荷物のコンテナ
      box,
      // 船のうしろの建物（ブリッジ）と煙突
      '<rect x="56" y="14" width="14" height="18" fill="#C94A4A"/><rect x="56" y="20" width="14" height="4" fill="#fff"/>',
      '<rect x="26" y="30" width="52" height="8" rx="2" fill="#DDE3EC"/><rect x="30" y="36" width="44" height="34" fill="#F4F6FA"/>', win,
      '<path d="M38 30V18" stroke="#35506B" stroke-width="2"/>',
      // 海（船の下のほうに重なる）
      `<path d="${wave(95, 6)}V105Q300 118 287 118H13Q0 118 0 105Z" fill="#4A9AD4" opacity=".92"/>`,
      `<path d="${wave(95, 6)}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6"/>`,
      `<path d="${wave(106, 5)}V108Q300 118 287 118H13Q0 118 0 108Z" fill="#3B86C4" opacity=".85"/>`,
      // しぶき
      '<ellipse cx="288" cy="96" rx="11" ry="3.2" fill="#fff" opacity=".85"/><ellipse cx="14" cy="96" rx="9" ry="2.8" fill="#fff" opacity=".8"/><ellipse cx="270" cy="100" rx="8" ry="2.2" fill="#fff" opacity=".6"/>',
    ].join('');
  } },
};
const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
export function expandArts(svg = '') {
  return String(svg).replace(/<art\b([^>]*?)\/?>(\s*<\/art>)?/gi, (_, attrs) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => [m[1].toLowerCase(), m[2] ?? m[3]]));
    const art = ARTS[a.name];
    if (!art) { console.warn(`::warning::部品 "${a.name}" が見つからないため、図から消えました（arts.mjs にある名前か確認）`); return ''; }
    const x = num(a.x, 0), y = num(a.y, 0), w = num(a.width, art.W), h = +(w * art.H / art.W).toFixed(1);
    return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${art.W} ${art.H}" overflow="visible" aria-hidden="true">${art.f(a)}</svg>`;
  });
}
