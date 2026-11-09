// ニュースの記事の最後に出す「この話題の覚えるシート」を、記事の単元・見出しから選ぶ
export const SHEET_META = {
  'kenpo-sanken': ['憲法・三権・選挙', 'kokkai'],
  kokusai: ['国連と国際ニュース', 'un'],
  'kankyo-kagaku': ['環境・エネルギー・科学', 'earth'],
  todofuken: ['都道府県と日本の地理', 'pin'],
  'tani-wariai': ['単位・分数・割合', 'ruler'],
  wariai: ['分数・小数・割合 ずかい', 'pie'],
  zukei: ['図形の公式', 'cube'],
  nenpyo: ['日本の歴史 年表', 'scroll'],
  bushu: ['部首ずかん', 'kanji'],
};
// 上から順に、先に当たったものを使う（単元・見出しの文字で判定）
const RULES = [
  [/国会|三権|選挙|憲法|内閣|政治のしくみ|裁判|人権|平和主義|議員|法案|地方自治/, 'kenpo-sanken'],
  [/国際|国連|世界の国|アジア|貿易|領土|中東|アメリカ|ロシア|外交|条約/, 'kokusai'],
  [/エネルギー|環境|温暖化|資源|科学技術|気体|触媒|化学|原発|電力|再生可能/, 'kankyo-kagaku'],
  [/気候|地理|人口|都道府県|産業|農業|漁業|工業/, 'todofuken'],
  [/歴史|年表|江戸|明治|昭和|戦争|暦|祝日/, 'nenpyo'],
];
const MATH = [[/割合|百分率|歩合|％|%|分数|小数/, 'wariai'], [/速さ|単位|長さ|重さ|面積|体積|時間/, 'tani-wariai'], [/図形|角|三角形|円|立体/, 'zukei']];
export function relatedSheets(n, a, i) {
  const out = [];
  const text = [...(n.units || []), n.title || ''].join(' ');
  for (const [re, id] of RULES) if (re.test(text)) { out.push(id); break; }
  if (a?.math && a.math.news === i + 1) for (const [re, id] of MATH) if (re.test(`${a.math.unit || ''} ${a.math.q || ''}`)) { if (!out.includes(id)) out.push(id); break; }
  return out.slice(0, 2);
}
