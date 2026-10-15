// 下書きの二重チェック：①ふりがなの読みを辞書で照合 ②別の Claude が出典と照らして事実確認
// 結果は .review/YYYY-MM-DD.md の末尾に追記し、問題があれば .review/YYYY-MM-DD.flag を作る
import fs from 'node:fs';
import path from 'node:path';
import kuromoji from 'kuromoji';
import { plain, todayJst } from '../src/markup.mjs';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const date = process.env.TARGET_DATE || todayJst();
const file = path.join('content', `${date}.json`);
if (!fs.existsSync(file)) { console.log('記事がありません'); process.exit(0); }
const a = JSON.parse(fs.readFileSync(file, 'utf8'));

// ---------- ① ふりがな ----------
const kata2hira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const tokenizer = await new Promise((res, rej) => kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((e, t) => (e ? rej(e) : res(t))));
const texts = [];
const walk = (v, where) => {
  if (typeof v === 'string') texts.push([where, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'svg') walk(x, `${where}.${k}`);
};
walk(a, 'article');
const rubyIssues = [];
const hira2kata = (x) => x.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const loose = (x) => kata2hira(x).normalize('NFD').replace(/[\u3099\u309a]/g, '');
for (const [where, s] of texts) {
  // ふりがな記法を外した文と、各ふりがなの位置
  const spans = []; let out = ''; let last = 0;
  for (const m of s.matchAll(/\{([^{}|]+)\|([^{}|]+)\}/g)) {
    out += s.slice(last, m.index).replace(/==|\*\*/g, '');
    spans.push({ s: out.length, e: out.length + m[1].length, kanji: m[1], yomi: m[2] });
    out += m[1]; last = m.index + m[0].length;
  }
  if (!spans.length) continue;
  out += s.slice(last).replace(/==|\*\*/g, '');
  const toks = tokenizer.tokenize(out);
  for (const sp of spans) {
    const cover = toks.filter((t) => { const a0 = t.word_position - 1, a1 = a0 + t.surface_form.length; return a0 < sp.e && a1 > sp.s; });
    if (!cover.length || cover.some((t) => !t.reading || t.word_type === 'UNKNOWN')) continue;
    const startPos = cover[0].word_position - 1;
    const surface = cover.map((t) => t.surface_form).join('');
    let reading = cover.map((t) => t.reading).join('');
    const pre = hira2kata(surface.slice(0, sp.s - startPos));
    const suf = hira2kata(surface.slice(sp.s - startPos + sp.kanji.length));
    if (/[\u4e00-\u9fff]/.test(pre + suf)) continue; // 前後に別の漢字がまざる場合は判定しない
    if (pre && reading.startsWith(pre)) reading = reading.slice(pre.length);
    if (suf && reading.endsWith(suf)) reading = reading.slice(0, -suf.length);
    const dict = kata2hira(reading), given = kata2hira(sp.yomi.replace(/\s/g, ''));
    if (dict !== given && loose(dict) !== loose(given)) rubyIssues.push({ where, kanji: sp.kanji, given, dict });
  }
}

// ---------- ② 事実確認 ----------
let factIssues = [];
let factNote = '';
const KEY = process.env.ANTHROPIC_API_KEY;
const FACT_FILE = path.join('.review', `${date}-fact.json`);
if (fs.existsSync(FACT_FILE)) {
  // サブスク版：Claude Code が書き出した事実確認の結果を使う
  try { factIssues = JSON.parse(fs.readFileSync(FACT_FILE, 'utf8')); } catch { factNote = '事実確認の結果を読み取れませんでした。人の確認を念入りにお願いします。'; }
} else if (KEY) {
  const brief = a.news.map((n, i) => `【${i + 1}】${plain(n.title)}\n${[...n.points, ...n.body].map(plain).join('\n')}\nクイズ：${plain(n.quiz.q)} → ${plain(n.quiz.a)}`).join('\n\n');
  const sys = 'あなたは子ども向けニュースサイトの校閲者です。記事の中の事実（数字・日付・人名・地名・できごとの順番・誰が何を言ったか）を、web_search で信頼できる報道や公的機関の情報と照らして確認します。意見や書き方の好みには触れません。最後に JSON 配列だけを出力します。';
  const user = `次の記事（${date}付）の事実を確認してください。参考にした出典：\n${(a.sources || []).map((s) => `- ${s.title} ${s.url}`).join('\n')}\n\n${brief}\n\n出力形式：[{"news":番号,"claim":"確認した記述","verdict":"ok|wrong|unclear","detail":"根拠や問題点（短く）","fix":"直し方（wrong/unclear のとき）"}]\n確認すべき記述は、各ニュース3〜6個を目安に、数字や固有名詞を優先してください。`;
  const body = (messages) => JSON.stringify({ model: process.env.CLAUDE_MODEL || cfg.model, max_tokens: 8000, system: sys, messages, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }] });
  let messages = [{ role: 'user', content: user }], res;
  for (let k = 0; k < 6; k++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' }, body: body(messages) });
    if (!r.ok) { factNote = `事実確認の API 呼び出しに失敗しました（${r.status}）。人の確認を念入りにお願いします。`; break; }
    res = await r.json();
    if (res.stop_reason !== 'pause_turn') break;
    messages = [...messages, { role: 'assistant', content: res.content }];
  }
  if (res && !factNote) {
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    try { factIssues = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); fs.mkdirSync('.review', { recursive: true }); fs.writeFileSync(FACT_FILE, JSON.stringify(factIssues, null, 1)); } catch { factNote = '事実確認の結果を読み取れませんでした。人の確認を念入りにお願いします。'; }
  }
} else {
  factNote = 'AI による事実確認は行われていません。人の確認を念入りにお願いします。';
}

// ---------- 書き出し ----------
const bad = factIssues.filter((x) => x.verdict !== 'ok');
const md = `
### 🔎 AI による事実確認
${factNote || (bad.length ? bad.map((x) => `- [ ] **【${x.news}】${x.verdict === 'wrong' ? '❌ まちがいの可能性' : '⚠️ 確認できず'}**：${x.claim}\n  - ${x.detail}${x.fix ? `\n  - 直し方：${x.fix}` : ''}`).join('\n') : `確認した ${factIssues.length} 件はすべて出典と一致しました。`)}
${factIssues.length ? `\n<details><summary>確認した記述（${factIssues.length}件）</summary>\n\n${factIssues.map((x) => `- ${x.verdict === 'ok' ? '✅' : x.verdict === 'wrong' ? '❌' : '⚠️'}【${x.news}】${x.claim}`).join('\n')}\n</details>` : ''}

### 🔤 ふりがなの読みチェック（辞書と照合）
${rubyIssues.length ? rubyIssues.map((x) => `- [ ] 「${x.kanji}」：記事は「${x.given}」、辞書は「${x.dict}」（${x.where}）`).join('\n') + '\n\n※ 辞書の読みが文脈に合わないこともあります。正しい方を選んでください。' : '辞書と食いちがう読みはありませんでした。'}
`;
fs.mkdirSync('.review', { recursive: true });
fs.appendFileSync(path.join('.review', `${date}.md`), md);
if (bad.length || rubyIssues.length || factNote) fs.writeFileSync(path.join('.review', `${date}.flag`), `${bad.length} ${rubyIssues.length}`);
console.log(md);
