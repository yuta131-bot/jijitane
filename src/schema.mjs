import { BASEMAPS } from './markup.mjs';
const BASEMAP_NAMES = Object.keys(BASEMAPS);
// 記事データの形をチェックする（AI の出力が崩れていないか）
export function validate(a) {
  const e = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a?.date || '')) e.push('date が YYYY-MM-DD ではありません');
  if (!Array.isArray(a?.news) || a.news.length !== 3) { e.push('news がちょうど3本ではありません'); return e; }
  a.news.forEach((n, i) => {
    const p = `news[${i}]`;
    for (const k of ['subject', 'title', 'short_title', 'caption', 'talk']) if (typeof n[k] !== 'string' || !n[k].trim()) e.push(`${p}.${k} がありません`);
    if (!['rika', 'shakai', 'other'].includes(n.subject_key)) e.push(`${p}.subject_key は rika / shakai / other のどれか`);
    if (!Array.isArray(n.points) || n.points.length < 2) e.push(`${p}.points が足りません`);
    if (!Array.isArray(n.body) || n.body.length < 2) e.push(`${p}.body が足りません`);
    if (!Array.isArray(n.keywords)) e.push(`${p}.keywords がありません`);
    if (!n.quiz?.q || !n.quiz?.a) e.push(`${p}.quiz がありません`);
    if (n.quiz?.choices !== undefined) {
      if (!Array.isArray(n.quiz.choices) || n.quiz.choices.length < 2 || n.quiz.choices.length > 4) e.push(`${p}.quiz.choices は2〜4個`);
      else if (!Number.isInteger(n.quiz.answer) || n.quiz.answer < 0 || n.quiz.answer >= n.quiz.choices.length) e.push(`${p}.quiz.answer が選択肢の番号になっていません`);
    }
    if (n.units !== undefined && !Array.isArray(n.units)) e.push(`${p}.units は配列`);
    if (typeof n.svg !== 'string' || !/^\s*<svg[\s>]/i.test(n.svg) || !/<\/svg>\s*$/i.test(n.svg)) e.push(`${p}.svg が正しい SVG ではありません`);
    if (/<script/i.test(n.svg || '')) e.push(`${p}.svg に script が入っています`);
    for (const m of String(n.svg || '').matchAll(/<basemap\b[^>]*name="([^"]*)"/gi)) {
      if (!BASEMAP_NAMES.includes(m[1])) e.push(`${p}.svg のベースマップ名「${m[1]}」がありません（${BASEMAP_NAMES.join(' / ')}）`);
    }
    const brace = (JSON.stringify(n).match(/\{[^{}|"]*$/g) || []).length;
    if (brace) e.push(`${p} のふりがな記法が閉じていない可能性があります`);
  });
  if (a.math !== undefined && a.math !== null) {
    const m = a.math;
    if (![1, 2, 3].includes(Number(m.news))) e.push('math.news は 1〜3（問題をつけるニュースの番号）');
    for (const k of ['q', 'answer']) if (typeof m[k] !== 'string' || !m[k].trim()) e.push(`math.${k} がありません`);
    if (m.steps !== undefined && !Array.isArray(m.steps)) e.push('math.steps は配列');
  }
  return e;
}
