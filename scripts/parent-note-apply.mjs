// Issue「今日の親のひとこと（日付）」へのコメントを、その日の記事の parent_note に書き込む
import fs from 'node:fs';
const title = process.env.ISSUE_TITLE || '';
const m = title.match(/（(\d{4}-\d{2}-\d{2})）/);
if (!m) { console.log('日付が読み取れません'); process.exit(1); }
const file = `content/${m[1]}.json`;
if (!fs.existsSync(file)) { console.log('その日の号がありません'); process.exit(1); }
const text = String(process.env.COMMENT_BODY || '').replace(/\r/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
if (!text) { console.log('コメントが空です'); process.exit(1); }
const a = JSON.parse(fs.readFileSync(file, 'utf8'));
a.parent_note = text;
fs.writeFileSync(file, JSON.stringify(a, null, 2) + '\n');
console.log(`${m[1]} にひとことを書き込みました：${text}`);
