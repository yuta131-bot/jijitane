// 記事データの形をチェックする（Claude Code が自分で直すときにも使う）
// 使い方: node scripts/validate.mjs content/2026-10-15.json
import fs from 'node:fs';
import { validate } from '../src/schema.mjs';
const f = process.argv[2];
let a;
try { a = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`JSON として読めません: ${e.message}`); process.exit(1); }
const errs = validate(a);
if (errs.length) { console.error('直してください:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('OK：形に問題はありません');
