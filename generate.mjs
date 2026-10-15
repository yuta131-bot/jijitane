// Claude API で今日の記事の下書きを作り、content/YYYY-MM-DD.json と .review/YYYY-MM-DD.md を書き出す
import fs from 'node:fs';
import path from 'node:path';
import { validate } from '../src/schema.mjs';
import { writeReview } from '../src/review.mjs';
import { todayJst, jpDate, plain } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || cfg.model;
const date = process.env.TARGET_DATE || todayJst();
if (!KEY) { console.error('ANTHROPIC_API_KEY が設定されていません'); process.exit(1); }

const out = path.join('content', `${date}.json`);
if (fs.existsSync(out) && !process.env.OVERWRITE) { console.log(`${out} はすでにあります。スキップします`); process.exit(0); }

// 直近7号の見出し（話題のかぶりを避けるため）
const recent = fs.readdirSync('content').filter((f) => f.endsWith('.json') && f < `${date}.json`).sort().slice(-7)
  .map((f) => { const a = JSON.parse(fs.readFileSync(path.join('content', f), 'utf8')); return `${a.date}: ${a.news.map((n) => plain(n.title)).join(' / ')}`; });

// お手本として最新号のニュース1本を渡す
const sampleFile = fs.readdirSync('content').filter((f) => f.endsWith('.json')).sort().pop();
const sample = sampleFile ? JSON.parse(fs.readFileSync(path.join('content', sampleFile), 'utf8')).news[0] : null;

const system = fs.readFileSync('prompts/system.md', 'utf8').replace('{{SITE_NAME}}', cfg.siteName);
const user = `今日は ${jpDate(date).label}（日本時間）です。今日の3本を選び、記事データを作ってください。

直近の号の見出し（かぶりを避ける）:
${recent.join('\n') || '（まだありません）'}

${sample ? `書きぶりのお手本（ニュース1本分）:\n${JSON.stringify(sample)}` : ''}

date は "${date}" にしてください。最後は JSON だけを出力してください。`;

async function call(messages) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 32000, system, messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15, user_location: { type: 'approximate', country: 'JP', timezone: 'Asia/Tokyo' } }],
      }),
    });
    if (r.ok) return r.json();
    const t = await r.text();
    console.error(`API エラー (${r.status}) ${t.slice(0, 500)}`);
    if (r.status < 500 && r.status !== 429) throw new Error('API エラー');
    await new Promise((res) => setTimeout(res, 20000 * attempt));
  }
  throw new Error('API に何度か失敗しました');
}

// 長い検索で pause_turn になったら続けさせる
async function run(messages) {
  let res;
  for (let i = 0; i < 6; i++) {
    res = await call(messages);
    if (res.stop_reason !== 'pause_turn') break;
    messages = [...messages, { role: 'assistant', content: res.content }];
  }
  return { res, messages };
}

function extractJson(res) {
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('JSON が見つかりません');
  return JSON.parse(text.slice(s, e + 1).replace(/^```json|```$/g, ''));
}

let messages = [{ role: 'user', content: user }];
let { res, messages: hist } = await run(messages);
let data, errs = [];
try { data = extractJson(res); errs = validate(data); } catch (e) { errs = [e.message]; }

// 形が崩れていたら1回だけ直させる
if (errs.length) {
  console.log('出力を直してもらいます:', errs);
  hist = [...hist, { role: 'assistant', content: res.content }, { role: 'user', content: `出力に次の問題があります。直した JSON 全体だけを出力してください。\n- ${errs.join('\n- ')}` }];
  ({ res } = await run(hist));
  data = extractJson(res);
  errs = validate(data);
  if (errs.length) { console.error(errs); process.exit(1); }
}
data.date = date;

// 検索結果に実際に出てきた URL だけを出典として残す
const seen = new Set();
for (const m of [...hist, { role: 'assistant', content: res.content }]) {
  if (!Array.isArray(m.content)) continue;
  for (const b of m.content) if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach((x) => x.url && seen.add(x.url));
}
const before = (data.sources || []).length;
data.sources = (data.sources || []).filter((s) => seen.has(s.url));
const dropped = before - data.sources.length;

fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');

// PR に載せる確認メモ
writeReview(data, cfg, dropped);
console.log(`下書きを書き出しました: ${out}`);
