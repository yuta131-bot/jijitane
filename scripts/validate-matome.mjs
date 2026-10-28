// 年間まとめの形をチェックする
// 使い方: node scripts/validate-matome.mjs content/matome/2027.json
import fs from 'node:fs';
import { validateMatome } from '../src/schema.mjs';
const f = process.argv[2];
let m;
try { m = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`JSON として読めません: ${e.message}`); process.exit(1); }
const keys = new Set();
for (const g of fs.readdirSync('content').filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x))) {
  const a = JSON.parse(fs.readFileSync(`content/${g}`, 'utf8'));
  a.news.forEach((_, i) => keys.add(`${a.date}-${i + 1}`));
}
const errs = validateMatome(m, keys);
if (errs.length) { console.error('直してください:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log(`OK：形に問題はありません（トピック${m.topics.length}個）`);
