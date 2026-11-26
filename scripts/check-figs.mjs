// 図（svg）の機械チェック：AI の見直しの前に、機械で分かるまちがいを見つける
//   1. 図の中の数字が、本文・3行まとめ・見出し・説明文・クイズのどこにも出てこない → 書きまちがいの可能性
//   2. 地図（basemap）が図の下にはみ出している
//   3. 13 より小さい文字（ふりがな用の 10〜11 はのぞく）
//   4. <basemap> / <art> の名前がまちがっていて、図から消える（地図・部品が出ない）
//   5. 地名が3つ以上あるのに地図がない（点とラベルだけが浮いている図）
// 使い方: node scripts/check-figs.mjs 2026-10-30   → .review/2026-10-30-auto.json（見直しと同じ形）
import fs from 'node:fs';
import path from 'node:path';
import { BASEMAPS, plain } from '../src/markup.mjs';
import { ARTS } from '../src/arts.mjs';

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
  const attrsOf = (str) => Object.fromEntries([...str.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((x) => [x[1].toLowerCase(), x[2] ?? x[3]]));
  for (const m of svg.matchAll(/<art\b([^>]*)\/?>/gi)) {
    const at = attrsOf(m[1]);
    if (!ARTS[at.name]) out.push({ news: no, claim: `部品 art「${at.name}」`, verdict: 'wrong', detail: '名前が arts.mjs にないため、図から消えています。', fix: `名前を ${Object.keys(ARTS).join(' / ')} のどれかにする` });
  }
  if (!/<basemap\b/i.test(svg)) {
    const places = new Set(texts.join(' ').match(/北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄/g) || []);
    const dots = (svg.match(/<circle\b/gi) || []).length;
    if (places.size >= 3 && dots >= 3) out.push({ news: no, claim: '地図があるか', verdict: 'unclear', detail: `地名が ${places.size} か所（${[...places].join('・')}）と点があるのに、地図（basemap）がありません。点とラベルだけが浮いて見えていないか、画像で確かめてください。`, fix: '場所を示す図なら <basemap name="japan" .../> を入れて、点の位置を合わせる' });
  }
  for (const m of svg.matchAll(/<basemap\b([^>]*)\/?>/gi)) {
    const at = attrsOf(m[1]);
    if (!BASEMAPS[at.name]) out.push({ news: no, claim: `地図 basemap「${at.name}」`, verdict: 'wrong', detail: '名前が basemaps.json にないため、地図が消えています。', fix: `名前を ${Object.keys(BASEMAPS).join(' / ')} のどれかにする` });
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
