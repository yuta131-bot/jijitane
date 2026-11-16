// 毎朝、「運営者（親）が自分で書いたほうが効く話題」がある日だけ、GitHub の Issue でお知らせする
//   ・お子さんや家計・入試に近い話題（体験が書ける）を見つける。なければ何もしない（書かなくてよい日）
//   ・Issue にコメントすると、parent-note.yml がその日の記事に「運営者のひとこと」として載せる
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { plain, jpDate, todayJst } from '../src/markup.mjs';

const date = process.env.TARGET_DATE || todayJst();
const file = `content/${date}.json`;
if (!fs.existsSync(file)) { console.log(`${date} の号がまだありません`); process.exit(0); }
const a = JSON.parse(fs.readFileSync(file, 'utf8'));
if (a.parent_note) { console.log('すでにひとことがあります'); process.exit(0); }

// 家計・子ども・学校・入試に近い言葉（体験や家での会話が書きやすい話題）
const KEYS = /税|物価|値上|値下|金利|給料|賃金|年金|保険|料金|補助|給食|学校|教育|入試|受験|塾|子ども|こども|児童|生徒|スマホ|ゲーム|SNS|ネット|食品|米|価格|交通|電車|バス|旅行|観光|防災|地震|台風|感染|インフルエンザ|選挙/;
const picks = a.news.map((n, i) => ({ i, n, text: plain([n.title, ...(n.points || [])].join(' ')) }))
  .filter(({ text }) => KEYS.test(text));
if (!picks.length) { console.log('今日は、体験を書くのに向いた話題がないので、お知らせしません'); process.exit(0); }

const title = `今日の親のひとこと（${date}）`;
const exists = JSON.parse(execFileSync('gh', ['issue', 'list', '--state', 'all', '--search', `"${title}" in:title`, '--json', 'title'], { encoding: 'utf8' }));
if (exists.some((x) => x.title === title)) { console.log('すでにお知らせ済みです'); process.exit(0); }

const dt = jpDate(date);
const body = [
  `${dt.label}の号で、**優太さんが自分で書いたほうが効く**話題があります（体験が入ると、「人が書いている、ここだけのサイト」になります）。`,
  '',
  ...picks.flatMap(({ i, n }) => [`**${i + 1}本目：${plain(n.short_title || n.title)}**`, `- お子さんへの問いかけ（記事にある）：${plain(n.talk)}`, '']),
  '### 書き方',
  'このIssueに**コメント**を1つ書いてください。1〜2文で大丈夫です（200字まで）。',
  '- 例：「うちの子に聞いたら、『13人もいたら選べない』と言っていました。」',
  '- 数分後に、今日の記事のいちばん下に「運営者のひとこと」として載ります。もう一度コメントすると、書きかえられます。',
  '- 本当にあった会話や、ほんとうに感じたことだけを書いてください（作り話は載せないでください）。',
  '',
  '書けない日は、このIssueは無視して大丈夫です。',
].join('\n');
fs.writeFileSync('nudge-body.txt', body);
execFileSync('gh', ['issue', 'create', '--title', title, '--body-file', 'nudge-body.txt'], { stdio: 'inherit' });
