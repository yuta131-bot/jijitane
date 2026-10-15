// 記事データから確認メモを作る（サブスク版の下書き作成のあとに使う）
import fs from 'node:fs';
import path from 'node:path';
import { writeReview } from '../src/review.mjs';
import { todayJst } from '../src/markup.mjs';
const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const date = process.env.TARGET_DATE || todayJst();
const a = JSON.parse(fs.readFileSync(path.join('content', `${date}.json`), 'utf8'));
writeReview(a, cfg);
console.log('確認メモを作りました');
