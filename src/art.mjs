// 覚えるシートの、ちいさなイラスト（SVG・64x64）。見出しやカードの横に置いて、小学生が親しみやすい雰囲気にする
const K = '#1D2B44';
const S = `stroke="${K}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const face = (x, y, s = 1) => `<circle cx="${x - 5 * s}" cy="${y}" r="${1.6 * s}" fill="${K}"/><circle cx="${x + 5 * s}" cy="${y}" r="${1.6 * s}" fill="${K}"/><path d="M${x - 3 * s} ${y + 3.5 * s} Q${x} ${y + 7 * s} ${x + 3 * s} ${y + 3.5 * s}" fill="none" ${S} stroke-width="1.6"/><circle cx="${x - 9 * s}" cy="${y + 4 * s}" r="${2.2 * s}" fill="#FFB7C5" opacity=".8"/><circle cx="${x + 9 * s}" cy="${y + 4 * s}" r="${2.2 * s}" fill="#FFB7C5" opacity=".8"/>`;
const A = {
  // 国会議事堂
  kokkai: `<rect x="6" y="40" width="52" height="16" rx="2" fill="#F3EBD8" ${S}/><rect x="22" y="30" width="20" height="26" fill="#F8F2E4" ${S}/><path d="M26 30 V22 H38 V30" fill="#F3EBD8" ${S}/><path d="M24 22 L32 8 L40 22 Z" fill="#7DC4A0" ${S}/><path d="M12 40 V34 H20 V40 M44 40 V34 H52 V40" fill="#F8F2E4" ${S}/><g fill="${K}"><rect x="29" y="44" width="6" height="12"/><rect x="11" y="45" width="4" height="6"/><rect x="19" y="45" width="4" height="6"/><rect x="41" y="45" width="4" height="6"/><rect x="49" y="45" width="4" height="6"/><rect x="28" y="32" width="3" height="5"/><rect x="33" y="32" width="3" height="5"/></g><path d="M32 8 V3" ${S}/>`,
  // 内閣・首相官邸（旗の立つ建物）
  kantei: `<rect x="8" y="30" width="48" height="26" rx="2" fill="#E6EEF8" ${S}/><path d="M6 30 L32 16 L58 30 Z" fill="#8FB4E3" ${S}/><g fill="${K}"><rect x="29" y="42" width="6" height="14"/><rect x="13" y="37" width="6" height="7"/><rect x="45" y="37" width="6" height="7"/><rect x="21" y="37" width="6" height="7"/><rect x="37" y="37" width="6" height="7"/></g><path d="M32 16 V5" ${S}/><path d="M32 5 H44 L40 9 L44 13 H32" fill="#E5484D" ${S} stroke-width="1.6"/>`,
  // 裁判所・天秤
  saiban: `<path d="M32 10 V52 M20 54 H44" ${S}/><circle cx="32" cy="9" r="3" fill="#F6C945" ${S}/><path d="M10 20 H54" ${S}/><path d="M10 20 L4 36 H16 Z M54 20 L48 36 H60 Z" fill="#FFE9A8" ${S}/><path d="M4 36 Q10 43 16 36 M48 36 Q54 43 60 36" fill="#F6C945" ${S}/>`,
  // 憲法・本
  book: `<path d="M8 12 H30 Q32 12 32 14 V54 Q32 52 30 52 H8 Z M56 12 H34 Q32 12 32 14 V54 Q32 52 34 52 H56 Z" fill="#CFE6FA" ${S}/><path d="M13 22 H26 M13 29 H26 M13 36 H26 M38 22 H51 M38 29 H51 M38 36 H51" ${S} stroke-width="1.6"/><path d="M40 42 L44 46 L52 38" fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 選挙・投票箱
  vote: `<rect x="10" y="26" width="44" height="28" rx="3" fill="#8FB4E3" ${S}/><rect x="22" y="26" width="20" height="4" fill="${K}"/><g transform="rotate(-8 32 14)"><rect x="20" y="4" width="24" height="18" rx="2" fill="#fff" ${S}/><path d="M26 13 L30 17 L38 8" fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g><circle cx="32" cy="42" r="5" fill="#FFE9A8" ${S} stroke-width="1.6"/>`,
  // 工場と煙
  factory: `<path d="M8 56 V30 L24 40 V30 L40 40 V20 H52 V56 Z" fill="#E9D5C0" ${S}/><rect x="42" y="12" width="8" height="8" fill="#C9B29B" ${S}/><g fill="#fff" ${S} stroke-width="1.6"><circle cx="46" cy="9" r="5"/><circle cx="53" cy="5" r="4.5"/><circle cx="59" cy="9" r="3.6"/></g><g fill="#8FB4E3" ${S} stroke-width="1.4"><rect x="14" y="44" width="6" height="6"/><rect x="26" y="46" width="6" height="6"/><rect x="42" y="30" width="6" height="6"/><rect x="42" y="42" width="6" height="6"/></g>`,
  // 地球（かお付き）
  earth: `<circle cx="32" cy="32" r="24" fill="#8CCBF2" ${S}/><path d="M16 22 Q24 14 32 20 Q28 28 20 28 Q14 30 16 22 Z M38 36 Q48 30 52 40 Q46 52 38 46 Z" fill="#8FD19E" ${S} stroke-width="1.6"/>${face(30, 33, 0.9)}`,
  // 風車
  wind: `<path d="M32 56 L29 28 H35 Z" fill="#fff" ${S}/><circle cx="32" cy="26" r="3.5" fill="#F6C945" ${S}/><path d="M32 26 L28 4 L36 6 Z M32 26 L52 38 L47 44 Z M32 26 L12 38 L17 44 Z" fill="#fff" ${S}/><path d="M12 56 H52" stroke="#8FD19E" stroke-width="3" stroke-linecap="round"/>`,
  // 電球
  bulb: `<path d="M32 6 C20 6 14 15 14 24 C14 33 22 36 24 44 H40 C42 36 50 33 50 24 C50 15 44 6 32 6 Z" fill="#FFE27A" ${S}/><rect x="24" y="44" width="16" height="6" rx="2" fill="#C9D3DF" ${S}/><rect x="26" y="50" width="12" height="5" rx="2" fill="#C9D3DF" ${S}/><path d="M28 22 L32 30 L36 22" fill="none" ${S} stroke-width="1.8"/><path d="M6 14 L10 17 M58 14 L54 17 M4 28 H9 M55 28 H60" ${S} stroke-width="1.8"/>`,
  // ロケット
  rocket: `<path d="M32 4 C42 12 44 28 40 44 H24 C20 28 22 12 32 4 Z" fill="#fff" ${S}/><circle cx="32" cy="24" r="6" fill="#8CCBF2" ${S}/><path d="M24 34 L12 46 L24 44 Z M40 34 L52 46 L40 44 Z" fill="#E5484D" ${S}/><path d="M27 44 Q32 60 37 44 Z" fill="#FFB347" ${S}/>`,
  // SDGs・芽
  sprout: `<path d="M32 56 V32" ${S}/><path d="M32 36 C20 36 14 28 14 18 C26 18 32 24 32 36 Z" fill="#8FD19E" ${S}/><path d="M32 30 C32 20 38 12 50 12 C50 24 44 30 32 30 Z" fill="#6CC08B" ${S}/><path d="M16 56 H48" stroke="#B88A5C" stroke-width="4" stroke-linecap="round"/>`,
  // 国連・世界（旗つき）
  un: `<circle cx="32" cy="30" r="20" fill="#8CCBF2" ${S}/><path d="M12 30 H52 M32 10 Q22 30 32 50 M32 10 Q42 30 32 50 M16 20 H48 M16 40 H48" fill="none" ${S} stroke-width="1.4"/><path d="M6 24 Q4 42 20 54 M58 24 Q60 42 44 54" fill="none" stroke="#6CC08B" stroke-width="3" stroke-linecap="round"/>`,
  // 世界のあくしゅ
  hands: `<path d="M4 30 L18 22 L30 28 L40 22 L60 30 L52 44 L40 48 L30 52 L20 46 L10 42 Z" fill="#FFD9B8" ${S}/><path d="M18 22 L30 28 M40 22 L30 34 M24 38 L34 44 M30 52 L22 46" fill="none" ${S} stroke-width="1.6"/><rect x="2" y="26" width="8" height="18" rx="2" fill="#6B8BD6" ${S} stroke-width="1.6" transform="rotate(-14 6 35)"/><rect x="54" y="26" width="8" height="18" rx="2" fill="#E5846B" ${S} stroke-width="1.6" transform="rotate(14 58 35)"/>`,
  // お城
  castle: `<rect x="12" y="40" width="40" height="16" fill="#F4EEDD" ${S}/><path d="M16 40 L20 32 H44 L48 40 Z" fill="#6B8BD6" ${S}/><rect x="20" y="22" width="24" height="10" fill="#F4EEDD" ${S}/><path d="M17 22 L32 10 L47 22 Z" fill="#6B8BD6" ${S}/><path d="M30 10 L32 4 L34 10" fill="#F6C945" ${S} stroke-width="1.6"/><rect x="28" y="46" width="8" height="10" fill="${K}"/><rect x="29" y="24" width="6" height="6" fill="${K}"/>`,
  // 土器（縄文〜平安）
  doki: `<path d="M20 8 H44 L42 14 C54 20 56 38 46 50 Q42 56 32 56 Q22 56 18 50 C8 38 10 20 22 14 Z" fill="#E3A56F" ${S}/><path d="M16 26 Q32 34 48 26 M14 38 Q32 46 50 38" fill="none" ${S} stroke-width="1.8"/><path d="M24 20 L28 24 L32 20 L36 24 L40 20" fill="none" ${S} stroke-width="1.6"/>`,
  // かぶと（鎌倉〜安土桃山）
  kabuto: `<path d="M10 44 C8 24 20 12 32 12 C44 12 56 24 54 44 Z" fill="#6B7FB8" ${S}/><path d="M32 12 V4 M26 8 Q32 0 38 8" fill="none" stroke="#F6C945" stroke-width="3" stroke-linecap="round"/><path d="M8 44 H56 L52 54 H12 Z" fill="#E5484D" ${S}/><path d="M24 44 Q32 34 40 44" fill="#FFD9B8" ${S}/><path d="M20 22 Q32 28 44 22" fill="none" stroke="#F6C945" stroke-width="2.4"/>`,
  // 蒸気機関車（明治〜大正）
  train: `<rect x="8" y="26" width="30" height="20" rx="2" fill="#4A5568" ${S}/><rect x="38" y="16" width="16" height="30" rx="2" fill="#E5484D" ${S}/><rect x="42" y="20" width="8" height="8" fill="#CFE6FA" ${S} stroke-width="1.6"/><rect x="12" y="14" width="8" height="12" fill="#2D3748" ${S}/><circle cx="14" cy="8" r="4" fill="#fff" ${S} stroke-width="1.5"/><circle cx="22" cy="5" r="3" fill="#fff" ${S} stroke-width="1.5"/><circle cx="18" cy="50" r="7" fill="#F6C945" ${S}/><circle cx="46" cy="50" r="7" fill="#F6C945" ${S}/><path d="M4 57 H60" ${S}/>`,
  // 東京タワー（昭和〜令和）
  tower: `<path d="M32 4 L38 30 L46 58 H18 L26 30 Z" fill="#F08A5D" ${S}/><path d="M28 24 H36 M24 38 H40" ${S} stroke-width="1.8"/><path d="M26 30 H38 L36 24 H28 Z" fill="#fff" ${S} stroke-width="1.6"/><path d="M22 46 Q32 38 42 46" fill="none" ${S} stroke-width="1.6"/><path d="M32 4 V0" ${S}/>`,
  // 巻物（年表）
  scroll: `<path d="M12 12 H48 V50 H16 Q10 50 10 44 V14 Z" fill="#F7EBCB" ${S}/><path d="M48 12 Q56 12 56 18 Q56 24 48 24" fill="#E7D3A0" ${S}/><path d="M18 22 H40 M18 30 H40 M18 38 H34" ${S} stroke-width="1.8"/><circle cx="44" cy="40" r="5" fill="#E5484D" ${S} stroke-width="1.6"/>`,
  // ものさし
  ruler: `<rect x="4" y="22" width="56" height="20" rx="3" fill="#FFE27A" ${S}/><path d="M12 22 V32 M20 22 V28 M28 22 V32 M36 22 V28 M44 22 V32 M52 22 V28" ${S} stroke-width="1.8"/>`,
  // 円グラフ（わりあい）
  pie: `<circle cx="32" cy="32" r="24" fill="#FFE27A" ${S}/><path d="M32 32 V8 A24 24 0 0 1 56 32 Z" fill="#E5846B" ${S}/><path d="M32 32 L56 32 A24 24 0 0 1 38 55 Z" fill="#8FB4E3" ${S}/>`,
  // 日本・ピン
  pin: `<path d="M32 58 C20 42 14 34 14 24 A18 18 0 0 1 50 24 C50 34 44 42 32 58 Z" fill="#E5484D" ${S}/><circle cx="32" cy="24" r="7" fill="#fff" ${S}/>`,
  // 山
  mountain: `<path d="M2 54 L22 18 L34 38 L42 26 L62 54 Z" fill="#8FD19E" ${S}/><path d="M22 18 L16 29 L22 26 L27 30 Z" fill="#fff" ${S} stroke-width="1.6"/><circle cx="50" cy="12" r="6" fill="#FFD36B" ${S}/>`,
  // 立体（図形）
  cube: `<path d="M8 22 L32 10 L56 22 L32 34 Z" fill="#CFE6FA" ${S}/><path d="M8 22 V44 L32 56 V34 Z" fill="#8FB4E3" ${S}/><path d="M56 22 V44 L32 56 V34 Z" fill="#6B8BD6" ${S}/>`,
  // 筆・漢字
  kanji: `<rect x="6" y="8" width="38" height="38" rx="4" fill="#fff" ${S}/><path d="M25 8 V46 M6 27 H44" stroke="#F2A5A5" stroke-width="1.4" stroke-dasharray="3 3"/><text x="25" y="38" text-anchor="middle" font-size="28" font-weight="900" fill="${K}" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">漢</text><path d="M46 56 L58 28 L62 30 L52 58 Z" fill="#E7B66B" ${S} stroke-width="1.6"/>`,
  // えんぴつ（テスト・メモ）
  pencil: `<path d="M10 54 L14 40 L46 8 L56 18 L24 50 Z" fill="#FFE27A" ${S}/><path d="M46 8 L56 18 L60 14 Q62 10 58 6 Q54 2 50 4 Z" fill="#F29BB0" ${S}/><path d="M10 54 L14 40 L24 50 Z" fill="#F7E4C6" ${S}/><path d="M10 54 L12 48 L16 52 Z" fill="${K}"/>`,
  // はかり（重さ）
  weight: `<path d="M10 56 H54 L50 22 H14 Z" fill="#8FD19E" ${S}/><circle cx="32" cy="30" r="12" fill="#fff" ${S}/><path d="M32 30 L38 22" stroke="#E5484D" stroke-width="2.4" stroke-linecap="round"/><path d="M24 22 Q32 14 40 22" fill="none" ${S} stroke-width="1.4"/><circle cx="32" cy="30" r="1.8" fill="${K}"/><rect x="20" y="44" width="24" height="6" rx="3" fill="#fff" ${S} stroke-width="1.6"/>`,
  // 面積（マス目）
  area: `<rect x="8" y="8" width="48" height="48" rx="3" fill="#CFE6FA" ${S}/><path d="M24 8 V56 M40 8 V56 M8 24 H56 M8 40 H56" ${S} stroke-width="1.5"/><rect x="24" y="24" width="16" height="16" fill="#FFE27A" ${S} stroke-width="1.8"/>`,
  // コップ（かさ・体積）
  cup: `<path d="M14 8 H50 L45 56 H19 Z" fill="#E6F4FD" ${S}/><path d="M16 28 H48 L45 56 H19 Z" fill="#8CCBF2" ${S}/><path d="M14 18 H22 M14 28 H24 M14 38 H22" ${S} stroke-width="1.6"/><circle cx="34" cy="38" r="2" fill="#fff"/><circle cx="40" cy="46" r="1.6" fill="#fff"/>`,
  // 2乗
  sq2: `<rect x="6" y="14" width="36" height="36" rx="3" fill="#FFD6A5" ${S}/><text x="24" y="40" text-anchor="middle" font-size="22" font-weight="900" fill="${K}" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">n</text><text x="48" y="26" text-anchor="middle" font-size="20" font-weight="900" fill="#E5484D" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">2</text>`,
  // 円（円周率）
  circle: `<circle cx="30" cy="34" r="22" fill="#FFE27A" ${S}/><path d="M30 34 H52" stroke="#E5484D" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="34" r="2.2" fill="${K}"/><text x="26" y="26" text-anchor="middle" font-size="12" font-weight="900" fill="${K}" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">3.14</text>`,
  // 人々（国民）
  family: `<circle cx="20" cy="22" r="8" fill="#FFD9B8" ${S}/><circle cx="44" cy="24" r="7" fill="#FFD9B8" ${S}/><path d="M6 54 C6 40 14 34 20 34 C26 34 34 40 34 54 Z" fill="#6B8BD6" ${S}/><path d="M34 54 C34 42 38 36 44 36 C50 36 58 42 58 54 Z" fill="#E5846B" ${S}/><circle cx="17" cy="22" r="1.4" fill="${K}"/><circle cx="23" cy="22" r="1.4" fill="${K}"/>`,
  // 雪の結晶（北海道・東北）
  snow: `<circle cx="32" cy="32" r="26" fill="#E3F2FD" ${S}/><path d="M32 12 V52 M14 22 L50 42 M14 42 L50 22" ${S} stroke-width="2.4"/><path d="M27 15 L32 20 L37 15 M27 49 L32 44 L37 49" fill="none" ${S} stroke-width="1.8"/>`,
  // 太陽（九州・沖縄）
  sun: `<circle cx="32" cy="32" r="14" fill="#FFD36B" ${S}/><path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M14 14 L20 20 M44 44 L50 50 M14 50 L20 44 M44 20 L50 14" ${S}/>${face(32, 31, 0.8)}`,
  // 波（海）
  wave: `<path d="M4 20 Q12 12 20 20 T36 20 T52 20 T64 18 V56 H4 Z" fill="#8CCBF2" ${S}/><path d="M4 34 Q12 26 20 34 T36 34 T52 34 T64 32 M4 46 Q12 38 20 46 T36 46 T52 46 T64 44" fill="none" ${S} stroke-width="1.6"/><path d="M42 18 L50 4 L56 18 Z" fill="#fff" ${S} stroke-width="1.6"/>`,
  // ハート（国際協力）
  heart: `<path d="M32 56 C8 40 6 22 18 14 C26 9 32 16 32 20 C32 16 38 9 46 14 C58 22 56 40 32 56 Z" fill="#F4727F" ${S}/><path d="M18 24 Q20 18 26 18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  // 葉っぱ（生き物と自然）
  leaf: `<path d="M10 54 C6 28 24 8 54 8 C58 38 40 58 10 54 Z" fill="#8FD19E" ${S}/><path d="M10 54 C22 40 34 28 46 18" fill="none" ${S} stroke-width="1.8"/><path d="M26 38 L22 30 M34 30 L30 22" ${S} stroke-width="1.6"/>`,
  // くもと太陽（天気）
  cloud: `<circle cx="42" cy="20" r="11" fill="#FFD36B" ${S}/><path d="M16 52 C6 52 4 40 14 38 C14 28 28 26 32 34 C40 30 50 36 48 44 C54 46 52 52 46 52 Z" fill="#fff" ${S}/>`,
  // 時計
  clock: `<circle cx="32" cy="32" r="24" fill="#fff" ${S}/><path d="M32 16 V32 L42 38" fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g ${S} stroke-width="2.2"><path d="M32 10 V13 M32 51 V54 M10 32 H13 M51 32 H54"/></g>`,
  // 自動車（速さ）
  car: `<path d="M6 42 V34 Q6 30 10 30 L18 30 L24 18 H44 L52 30 H56 Q60 30 60 34 V42 Z" fill="#E5484D" ${S}/><path d="M25 21 H34 V30 H20 Z M37 21 H43 L49 30 H37 Z" fill="#CFE6FA" ${S} stroke-width="1.6"/><circle cx="18" cy="44" r="7" fill="#4A5568" ${S}/><circle cx="48" cy="44" r="7" fill="#4A5568" ${S}/><path d="M2 52 H14 M0 46 H8" ${S} stroke-width="1.6"/>`,
  // 角度
  angle: `<path d="M8 54 H56 M8 54 L46 14" ${S}/><path d="M26 54 A18 18 0 0 0 20 40" fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round"/><path d="M8 54 L46 14 L56 54 Z" fill="#CFE6FA" opacity=".7"/>`,
  // 正六角形
  hexagon: `<path d="M18 10 H46 L58 32 L46 54 H18 L6 32 Z" fill="#D9CCF0" ${S}/><path d="M18 10 L46 54 M46 10 L18 54 M6 32 H58" ${S} stroke-width="1.2" opacity=".6"/>`,
  // 三角形
  tri: `<path d="M32 8 L58 54 H6 Z" fill="#FFE27A" ${S}/><path d="M32 8 V54" stroke="#E5484D" stroke-width="2" stroke-dasharray="4 3"/>`,
  // はこ（展開図）
  box: `<path d="M8 20 L32 8 L56 20 V44 L32 56 L8 44 Z" fill="#E3B981" ${S}/><path d="M8 20 L32 32 L56 20 M32 32 V56" fill="none" ${S}/><path d="M20 14 L44 26 V34" fill="none" stroke="#fff" stroke-width="3"/>`,
  // ふで（つくり）
  brush: `<path d="M44 6 L58 20 L36 42 L22 28 Z" fill="#E7B66B" ${S}/><path d="M22 28 L36 42 C30 52 18 58 6 58 C10 46 14 34 22 28 Z" fill="${K}"/>`,
  // かんむり
  crown: `<path d="M8 46 L6 18 L20 30 L32 12 L44 30 L58 18 L56 46 Z" fill="#FFD36B" ${S}/><rect x="8" y="46" width="48" height="8" rx="2" fill="#F6B945" ${S}/><circle cx="32" cy="38" r="3.5" fill="#E5484D" ${S} stroke-width="1.4"/><circle cx="18" cy="40" r="2.6" fill="#6B8BD6" ${S} stroke-width="1.4"/><circle cx="46" cy="40" r="2.6" fill="#6B8BD6" ${S} stroke-width="1.4"/>`,
  // あし
  foot: `<path d="M20 8 C30 6 36 12 36 22 C36 34 40 40 42 48 C44 56 36 58 28 58 C16 58 12 50 14 40 C16 30 12 14 20 8 Z" fill="#FFD9B8" ${S}/><circle cx="44" cy="12" r="4" fill="#FFD9B8" ${S} stroke-width="1.6"/><circle cx="52" cy="20" r="3.4" fill="#FFD9B8" ${S} stroke-width="1.6"/><circle cx="55" cy="30" r="3" fill="#FFD9B8" ${S} stroke-width="1.6"/>`,
  // いえ（たれ）
  house: `<path d="M8 32 L32 10 L56 32 Z" fill="#E5846B" ${S}/><rect x="14" y="32" width="36" height="24" fill="#FFF3D6" ${S}/><rect x="27" y="40" width="10" height="16" fill="${K}"/><rect x="17" y="36" width="7" height="7" fill="#CFE6FA" ${S} stroke-width="1.4"/>`,
  // ながれる矢じるし（にょう）
  arrow: `<path d="M8 12 V40 Q8 52 20 52 H50" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/><path d="M8 12 V40 Q8 52 20 52 H50" fill="none" stroke="#6B8BD6" stroke-width="8" stroke-linecap="round" opacity=".5"/><path d="M44 40 L58 52 L44 62 Z" fill="#E5484D" ${S}/>`,
  // かこみ（かまえ）
  frame: `<rect x="8" y="8" width="48" height="48" rx="5" fill="#CFE6FA" ${S}/><rect x="20" y="20" width="24" height="24" rx="3" fill="#fff" ${S} stroke-dasharray="4 3"/><circle cx="32" cy="32" r="5" fill="#E5484D" ${S} stroke-width="1.6"/>`,
  // カレンダー
  calendar: `<rect x="8" y="12" width="48" height="44" rx="5" fill="#fff" ${S}/><path d="M8 26 V17 Q8 12 13 12 H51 Q56 12 56 17 V26 Z" fill="#E5846B" ${S}/><path d="M20 6 V16 M44 6 V16" ${S}/><g fill="#8FB4E3"><rect x="14" y="31" width="8" height="7" rx="1.5"/><rect x="28" y="31" width="8" height="7" rx="1.5"/><rect x="42" y="31" width="8" height="7" rx="1.5"/><rect x="14" y="43" width="8" height="7" rx="1.5"/><rect x="28" y="43" width="8" height="7" rx="1.5" fill="#F6C945"/></g>`,
  // ニュース（新聞）
  news: `<rect x="8" y="10" width="44" height="42" rx="3" fill="#fff" ${S}/><path d="M52 22 H58 V46 Q58 52 52 52" fill="#E6EEF8" ${S}/><rect x="14" y="16" width="14" height="12" fill="#8CCBF2" ${S} stroke-width="1.6"/><path d="M32 18 H46 M32 24 H46 M14 34 H46 M14 40 H46 M14 46 H38" ${S} stroke-width="1.6"/>`,
  // 防災・経済・速さ用
  typhoon: `<circle cx="32" cy="32" r="26" fill="#DDE8F5" ${S}/><path d="M32 8 C48 8 54 24 42 30 C34 34 26 28 32 22 M32 56 C16 56 10 40 22 34 C30 30 38 36 32 42" fill="none" ${S} stroke-width="3.5"/><circle cx="32" cy="32" r="3" fill="#E5484D" ${S} stroke-width="1.4"/>`,
  rain: `<path d="M16 38 C6 38 4 26 14 24 C14 14 28 12 32 20 C40 16 50 22 48 30 C54 32 52 38 46 38 Z" fill="#B8C4D4" ${S}/><path d="M18 44 L14 54 M30 44 L26 56 M42 44 L38 54" stroke="#4A90D9" stroke-width="3.5" stroke-linecap="round"/>`,
  siren: `<path d="M16 50 V32 A16 16 0 0 1 48 32 V50 Z" fill="#E5484D" ${S}/><rect x="10" y="50" width="44" height="8" rx="2" fill="#C9D3DF" ${S}/><path d="M24 34 A8 8 0 0 1 30 26" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M32 6 V10 M10 14 L14 18 M54 14 L50 18" ${S}/>`,
  quake: `<path d="M2 56 H62" ${S}/><path d="M8 56 L14 50 L22 58 L30 50 L40 58 L48 50 L56 56" fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g transform="rotate(-9 32 36)"><path d="M14 30 L32 12 L50 30 Z" fill="#E5846B" ${S}/><rect x="18" y="30" width="28" height="20" fill="#FFF3D6" ${S}/><rect x="28" y="38" width="8" height="12" fill="${K}"/></g><path d="M6 24 Q2 32 6 40 M58 24 Q62 32 58 40 M11 28 Q8 32 11 36 M53 28 Q56 32 53 36" fill="none" ${S} stroke-width="2.2"/>`,
  volcano: `<path d="M4 58 L24 22 H40 L60 58 Z" fill="#B88A5C" ${S}/><path d="M24 22 L28 28 L32 22 L36 28 L40 22 Z" fill="#E5484D" ${S} stroke-width="1.6"/><circle cx="30" cy="12" r="6" fill="#C9D3DF" ${S} stroke-width="1.6"/><circle cx="40" cy="8" r="5" fill="#DDE3EC" ${S} stroke-width="1.6"/><path d="M28 40 L24 52 M36 40 L40 52" ${S} stroke-width="1.6" stroke="#F6C945"/>`,
  shield: `<path d="M32 6 L54 14 V32 C54 46 44 54 32 58 C20 54 10 46 10 32 V14 Z" fill="#8FB4E3" ${S}/><path d="M22 32 L29 39 L43 24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  coin: `<circle cx="32" cy="32" r="24" fill="#FFD36B" ${S}/><circle cx="32" cy="32" r="17" fill="none" ${S} stroke-width="1.6"/><text x="32" y="41" text-anchor="middle" font-size="26" font-weight="900" fill="${K}" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">¥</text>`,
  yen: `<rect x="6" y="14" width="52" height="36" rx="4" fill="#CDEBC8" ${S}/><circle cx="32" cy="32" r="10" fill="#fff" ${S}/><text x="32" y="38" text-anchor="middle" font-size="15" font-weight="900" fill="${K}" font-family="Zen Maru Gothic, Noto Sans JP, sans-serif">¥</text><circle cx="13" cy="32" r="2" fill="${K}"/><circle cx="51" cy="32" r="2" fill="${K}"/>`,
  ship: `<path d="M6 38 H58 L50 54 H14 Z" fill="#E5484D" ${S}/><rect x="14" y="26" width="12" height="12" fill="#6B8BD6" ${S}/><rect x="28" y="26" width="12" height="12" fill="#F6C945" ${S}/><rect x="42" y="26" width="10" height="12" fill="#8FD19E" ${S}/><path d="M4 58 Q12 54 20 58 T36 58 T52 58 T64 56" fill="none" stroke="#4A90D9" stroke-width="2.4" stroke-linecap="round"/>`,
  walk: `<circle cx="34" cy="10" r="6" fill="#FFD9B8" ${S}/><path d="M34 16 L30 34 L22 54 M30 34 L42 42 L46 56 M32 20 L20 30 M32 20 L46 26" fill="none" ${S} stroke-width="3.5"/>`,
  moon: `<circle cx="32" cy="32" r="24" fill="#FFE9A0" ${S}/><path d="M42 10 C26 12 18 32 28 46 C34 54 46 54 52 46 C38 46 32 28 42 10 Z" fill="#F6C945" ${S} stroke-width="1.6"/><circle cx="22" cy="26" r="3" fill="#F2D675" ${S} stroke-width="1.4"/><circle cx="30" cy="40" r="2.2" fill="#F2D675" ${S} stroke-width="1.4"/>`,
  star: `<path d="M32 4 L39 24 L60 24 L43 36 L50 58 L32 44 L14 58 L21 36 L4 24 L25 24 Z" fill="#FFD36B" ${S}/>${face(32, 32, 0.8)}`,
  planet: `<circle cx="32" cy="32" r="14" fill="#F4B684" ${S}/><path d="M4 40 C4 28 60 14 60 24 C60 36 4 52 4 40 Z" fill="none" ${S} stroke-width="3"/><path d="M20 28 Q32 24 44 28" fill="none" ${S} stroke-width="1.6"/>`,
  dice: `<rect x="8" y="8" width="32" height="32" rx="6" fill="#fff" ${S}/><g fill="${K}"><circle cx="16" cy="16" r="2.6"/><circle cx="32" cy="16" r="2.6"/><circle cx="24" cy="24" r="2.6"/><circle cx="16" cy="32" r="2.6"/><circle cx="32" cy="32" r="2.6"/></g><rect x="26" y="26" width="30" height="30" rx="6" fill="#FFE27A" ${S}/><g fill="${K}"><circle cx="35" cy="35" r="2.6"/><circle cx="47" cy="47" r="2.6"/><circle cx="41" cy="41" r="2.6"/></g>`,
  speech: `<path d="M8 12 H56 Q60 12 60 16 V38 Q60 42 56 42 H30 L18 54 V42 H8 Q4 42 4 38 V16 Q4 12 8 12 Z" fill="#CFE6FA" ${S}/><path d="M14 22 H50 M14 30 H42" ${S} stroke-width="2"/>`,
};
export const ART_NAMES = Object.keys(A);
export const art = (name, cls = 'sx-ic') => A[name] ? `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${A[name]}</svg>` : '';

// 見出し・カードの文字から、ふさわしい絵をえらぶ（上から順に先に当たったもの）
const RULES = [
  [/月の満ち欠け|月の出|日食|月食/, 'moon'], [/太陽の南中|季節ができる/, 'sun'], [/星の動き|星座|星の明るさ/, 'star'], [/惑星/, 'planet'],
  [/並べ方|組み合わせ（|数え上げ|整数をつくる|道順/, 'dice'], [/約数と倍数|素因数分解|約数・倍数のきまり|倍数の見分け|素数|文章題での使い方/, 'sq2'],
  [/ことわざ|慣用句|四字熟語|似た意味|反対の意味|意味をまちがえ/, 'speech'],
  [/台風のきほん/, 'typhoon'], [/大雨でおきる|雨の強さ/, 'rain'], [/警戒レベル|注意報/, 'siren'], [/日本で起きた/, 'scroll'], [/津波/, 'wave'], [/地震/, 'quake'],
  [/火山/, 'volcano'], [/防災の基本|消費者を守る/, 'shield'], [/円高|円安/, 'yen'], [/貿易/, 'ship'],
  [/消費税のあゆみ/, 'coin'], [/税金のしゅるい/, 'kantei'], [/直接税/, 'hands'], [/予算/, 'pie'], [/お金と経済/, 'book'], [/社会保障/, 'heart'], [/旅人算/, 'walk'], [/通過算/, 'train'], [/流水算/, 'wave'],
  [/み・は・じ|平均の速さ/, 'car'], [/比のきほん|速さと比/, 'pie'], [/つるかめ/, 'bulb'],
  [/数直線/, 'ruler'], [/100マス/, 'area'], [/く・も・わ/, 'pencil'], [/割引き/, 'pie'],
  [/同じ大きさ/, 'pie'], [/へんしん/, 'rocket'], [/歩合の読み方/, 'book'], [/間違い|まちがい/, 'bulb'],
  [/クイズ|チャレンジ/, 'pencil'], [/まちがえやすい/, 'bulb'],
  [/国連の主な機関/, 'kantei'], [/専門機関/, 'bulb'],
  [/SDGs/, 'sprout'], [/北海道|東北/, 'snow'], [/関東/, 'tower'], [/中部/, 'mountain'], [/近畿/, 'castle'], [/中国・四国/, 'wave'], [/九州|沖縄/, 'sun'],
  [/海に面|海岸|海/, 'wave'], [/山・川|^山/, 'mountain'], [/端/, 'pin'], [/面積と人口|人口/, 'family'], [/領土/, 'pin'], [/協力/, 'heart'],
  [/生き物|自然|環境を守/, 'leaf'], [/天気|気象/, 'cloud'], [/時間/, 'clock'], [/速さ/, 'car'], [/角度/, 'angle'], [/多角形/, 'hexagon'], [/三角形/, 'tri'],
  [/四角形/, 'area'], [/展開図/, 'box'], [/水の量/, 'cup'], [/権利|義務|国民/, 'family'], [/ことば/, 'book'],
  [/^つくり/, 'brush'], [/^かんむり/, 'crown'], [/^あし/, 'foot'], [/^たれ/, 'house'], [/^にょう/, 'arrow'], [/^かまえ/, 'frame'],
  [/国会（|国会＝/, 'kokkai'], [/国会の種類/, 'calendar'], [/国会/, 'kokkai'], [/内閣|行政|首相/, 'kantei'], [/裁判|司法/, 'saiban'], [/憲法/, 'book'], [/選挙|投票/, 'vote'],
  [/三権/, 'saiban'], [/衆議院|参議院/, 'kokkai'], [/おたがい|チェック/, 'hands'], [/ニュース/, 'news'],
  [/温室効果ガス|ガス/, 'factory'], [/目標/, 'calendar'], [/温暖化|地球/, 'earth'], [/エネルギー/, 'wind'], [/SDGs/, 'sprout'], [/科学|宇宙/, 'rocket'],
  [/国連|国際連合|専門機関/, 'un'], [/集まり|つながり|条約/, 'hands'],
  [/縄文|平安/, 'doki'], [/鎌倉|室町|戦国|安土/, 'kabuto'], [/江戸/, 'castle'], [/明治|大正/, 'train'], [/昭和|平成|令和/, 'tower'], [/年表/, 'scroll'],
  [/重さ/, 'weight'], [/面積/, 'area'], [/体積|かさ/, 'cup'], [/長さ/, 'ruler'], [/円周率/, 'circle'], [/分数|割合|百分率|歩合/, 'pie'], [/平方|素数/, 'sq2'],
  [/地図|地方|産業|地理|都道府県/, 'pin'], [/部首|へん|つくり|かんむり|漢字/, 'kanji'], [/公式|図形|立体|表面積|三角形|四角形/, 'cube'],
  [/確認テスト|クイズ|チャレンジ|メモ/, 'pencil'], [/コツ|ポイント/, 'bulb'],
];
export const CARD_ART = new Set(['kokkai', 'kantei', 'saiban', 'vote']);
export const pickArt = (text) => { const t = String(text || ''); for (const [re, n] of RULES) if (re.test(t)) return n; return ''; };
