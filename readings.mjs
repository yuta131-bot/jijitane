// 読み上げ用：辞書（kuromoji）が文脈で正しく読める漢字は、そのまま漢字で読ませる。
// 辞書が読めない・読みがちがう語（人名・地名・専門用語など）だけ、ふりがなの読みで読ませる。
// 漢字のまま読ませた方が、助詞とのつながりやアクセントが自然になるため。
import kuromoji from 'kuromoji';

const kata2hira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hira2kata = (s) => s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

let tokenizer;
export async function loadTokenizer() {
  if (!tokenizer) tokenizer = await new Promise((res, rej) => kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((e, t) => (e ? rej(e) : res(t))));
  return tokenizer;
}

// 文字列の中のふりがなごとに、辞書の読みと合うかを調べる
export function checkRubies(s) {
  const spans = []; let out = ''; let last = 0;
  for (const m of s.matchAll(/\{([^{}|]+)\|([^{}|]+)\}/g)) {
    out += s.slice(last, m.index).replace(/==|\*\*/g, '');
    spans.push({ s: out.length, e: out.length + m[1].length, kanji: m[1], yomi: m[2] });
    out += m[1]; last = m.index + m[0].length;
  }
  if (!spans.length) return [];
  out += s.slice(last).replace(/==|\*\*/g, '');
  const toks = tokenizer.tokenize(out);
  return spans.map((sp) => {
    const cover = toks.filter((t) => { const a0 = t.word_position - 1, a1 = a0 + t.surface_form.length; return a0 < sp.e && a1 > sp.s; });
    if (!cover.length || cover.some((t) => !t.reading || t.word_type === 'UNKNOWN' || t.pos_detail_1 === '固有名詞')) return { ...sp, ok: false, dict: null };
    const startPos = cover[0].word_position - 1;
    const surface = cover.map((t) => t.surface_form).join('');
    let reading = cover.map((t) => t.reading).join('');
    const pre = hira2kata(surface.slice(0, sp.s - startPos));
    const suf = hira2kata(surface.slice(sp.s - startPos + sp.kanji.length));
    if (/[\u4e00-\u9fff]/.test(pre + suf)) return { ...sp, ok: false, dict: null };
    if (pre && reading.startsWith(pre)) reading = reading.slice(pre.length);
    if (suf && reading.endsWith(suf)) reading = reading.slice(0, -suf.length);
    const dict = kata2hira(reading), given = kata2hira(sp.yomi.replace(/\s/g, ''));
    const loose = (x) => x.normalize('NFD').replace(/[\u3099\u309a]/g, '');
    return { ...sp, ok: dict === given || loose(dict) === loose(given), dict };
  });
}

// 記事データ全体から「ふりがなの読みで読ませる語」の一覧を作る（キーは 漢字|よみ）
export async function sayKeys(articles) {
  await loadTokenizer();
  const keys = new Set();
  const walk = (v) => {
    if (typeof v === 'string') { for (const r of checkRubies(v)) if (!r.ok) keys.add(`${r.kanji}|${r.yomi}`); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'svg') walk(x);
  };
  walk(articles);
  return keys;
}
