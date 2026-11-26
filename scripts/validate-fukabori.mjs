// 深掘り記事の形をチェックする  使い方: node scripts/validate-fukabori.mjs content/fukabori/2026-11-26-xxx.json
import fs from 'node:fs';
import { validateFukabori } from '../src/fukabori.mjs';
const f = process.argv[2];
let a;
try { a = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`JSON として読めません: ${e.message}`); process.exit(1); }
const errs = validateFukabori(a);
if (errs.length) { console.error('直してください:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('OK：形に問題はありません');
