// 確認用 Pull Request の本文（.review/YYYY-MM-DD.md）を作る
import fs from 'node:fs';
import path from 'node:path';
import { plain, jpDate } from './markup.mjs';

export function writeReview(data, cfg, dropped = 0) {
  const date = data.date;
  const md = `## ${jpDate(date).label} の下書き

${data.news.map((n, i) => `${i + 1}. **${plain(n.title)}**（${plain(n.subject)}）`).join('\n')}

### 公開前に確認してください
- [ ] 事実・数字・日付が出典と合っている
- [ ] ふりがなの読みが正しい
- [ ] 図がくずれていない（この PR の下にある Actions の実行ページから「preview」をダウンロードし、index.html を開いて確認）
- [ ] 戦争・災害などの書き方が子ども向けとして適切
${(data.review_notes || []).map((x) => `- [ ] ${x}`).join('\n')}
${dropped ? `\n※ 検索結果で確認できなかった出典を ${dropped} 件取り除きました。` : ''}

### 出典
${(data.sources || []).map((s) => `- [${s.title}](${s.url})`).join('\n') || '（なし）'}

---
問題なければ **Merge** すると、サイトに公開され、${cfg.postHourJst}時以降に X へ投稿されます。直したいところは、このブランチの \`content/${date}.json\` を編集してください。
`;
  fs.mkdirSync('.review', { recursive: true });
  fs.writeFileSync(path.join('.review', `${date}.md`), md);
}
