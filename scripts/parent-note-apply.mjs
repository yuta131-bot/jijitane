// Issue「今日の親のひとこと（日付）」へのコメントを、その日の記事の parent_note に書き込む
// Issue「今日の親のひとこと（過去分まとめ）」では、コメントの各行を「11/20 ひとこと」の形で読み、日付ごとに書き込む
import fs from 'node:fs';
const title = process.env.ISSUE_TITLE || '';
if (/過去分/.test(title) && !/（\d{4}-\d{2}-\d{2}）/.test(title)) {
  const lines = String(process.env.COMMENT_BODY || '').replace(/\r/g, '').split('\n');
  let done = 0;
  for (const line of lines) {
    const m = line.trim().match(/^(?:(\d{4})[-\/年])?(\d{1,2})[-\/月](\d{1,2})日?[\s:：、,]*(.+)$/);
    if (!m) continue;
    const ymd = `${m[1] || '2026'}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    const f = `content/${ymd}.json`;
    const text = m[4].replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!fs.existsSync(f) || !text) { console.log(`${ymd}: 読み飛ばし`); continue; }
    const a = JSON.parse(fs.readFileSync(f, 'utf8'));
    a.parent_note = text;
    fs.writeFileSync(f, JSON.stringify(a, null, 2) + '\n');
    console.log(`${ymd} に書き込みました：${text}`);
    done++;
  }
  if (!done) { console.log('書き込める行がありません'); process.exit(1); }
  process.exit(0);
}
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
