// 図（svg）の機械チェック：AI の見直しの前に、機械で分かるまちがいを見つける
//   1. 図の中の数字が、本文・3行まとめ・見出し・説明文・クイズのどこにも出てこない → 書きまちがいの可能性
//   2. 地図（basemap）が図の下にはみ出している
//   3. 13 より小さい文字（ふりがな用の 10〜11 はのぞく）
// 使い方: node scripts/check-figs.mjs 2026-10-30   → .review/2026-10-30-auto.json（見直しと同じ形）
import fs from 'node:fs';
import path from 'node:path';
import { BASEMAPS, plain } from '../src/markup.mjs';

const date = process.argv[2];
const a = JSON.parse(fs.readFileSync(path.join('content', `${date}.json`), 'utf8'));
const z2h = (s) => String(s).replace(/[０-９．，]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
const norm = (s) => z2h(plain(s)).replace(/,/g, '');
const out = [];
a.news.forEach((n, i) => {
  const no = i + 1;
  const svg = String(n.svg || '');
  const texts = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const prose = norm([n.title, n.short_title, n.caption, ...(n.points || []), ...(n.body || []), n.quiz?.q, n.quiz?.a, ...(n.quiz?.choices || []), ...(n.keywords || []).map((k) => `${k.term} ${k.desc}`)].join(' '));
  const seen = new Set();
  for (const t of texts) {
    for (const m of norm(t).matchAll(/\d+(?:\.\d+)?/g)) {
      const v = m[0];
      if (seen.has(v) || v.length < 2 || v === date.slice(0, 4)) continue; // 1けたの数・確認済みの年はとばす
      seen.add(v);
      if (!prose.includes(v)) out.push({ news: no, claim: `図の中の数字「${v}」（${t.trim().slice(0, 30)}）`, verdict: 'unclear', detail: '本文・3行まとめ・説明文のどこにも同じ数字がありません。図の書きまちがいか、確かめていない数字の可能性があります。', fix: '出典で確かめ、正しい数字に直すか、図から外す' });
    }
  }
  const vb = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(svg);
  const H = vb ? +vb[2] : null;
  for (const m of svg.matchAll(/<basemap\b([^>]*)\/?>/gi)) {
    const at = Object.fromEntries([...m[1].matchAll(/([a-z-]+)\s*=\s*"([^"]*)"/gi)].map((x) => [x[1].toLowerCase(), x[2]]));
    const bm = BASEMAPS[at.name]; if (!bm || !H) continue;
    const w = parseFloat(at.width) || bm.W, y = parseFloat(at.y) || 0, h = w * bm.H / bm.W;
    if (y + h > H + 1) out.push({ news: no, claim: `地図（${at.name}）の位置`, verdict: 'wrong', detail: `地図の下はしが ${Math.round(y + h)} で、図の高さ ${H} からはみ出しています。`, fix: 'viewBox の高さを広げるか、地図の y を上げる' });
  }
  for (const m of svg.matchAll(/font-size\s*[:=]\s*"?\s*([\d.]+)/gi)) {
    const fs_ = parseFloat(m[1]);
    if (fs_ < 13 && fs_ > 11.5) { out.push({ news: no, claim: `文字の大きさ ${fs_}`, verdict: 'wrong', detail: 'スマホで読めるよう、図の文字は 13 以上にするルールです。', fix: '13 以上にする' }); break; }
  }
});
fs.mkdirSync('.review', { recursive: true });
fs.writeFileSync(path.join('.review', `${date}-auto.json`), JSON.stringify(out, null, 1));
console.log(`機械チェック：${out.length} 件`); out.forEach((x) => console.log(`- ${x.news}本目 ${x.claim}：${x.detail}`));
