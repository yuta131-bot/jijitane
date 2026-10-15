# 中受 じじニュースのたね

中学受験をめざす小学生と保護者のための、毎日3本の図解時事ニュースサイトです。
Claude が毎朝ニュースを調べて下書きし（Claude のサブスクリプションか API で動きます）、別の Claude とふりがな辞書で二重チェックしたあと、人が確認して公開します。公開後は X に自動投稿します。

---

## 完全自動で公開する（毎朝のチェックなし）

GitHub の **Settings → Secrets and variables → Actions → Variables** で、`AUTO_PUBLISH` を `true` にします。

毎朝の流れは次のようになります。
1. 5:00 Claude が下書きを作る
2. 別の Claude が事実確認
3. まちがいが見つかったら、Claude が自動で直す（確かめられない数字などは記事から外す）
4. 自動でマージしてサイトに公開 → 7:00 に X へ投稿

- 確認の記録は、マージ済みの Pull Request に毎日残ります（「自動で直したところ」も記載）。
- 事実確認そのものが失敗した日だけは公開を止め、Pull Request に「確認してください」とコメントが付きます。GitHub の通知をオンにしておいてください。
- 週に1回、その週の Pull Request をざっと見返すのがおすすめです。まちがいに気づいたら、記事に `corrections`（訂正）を足して直します。

## 毎日の流れ（確認してから公開する場合）

| 時刻（日本時間） | 何が起きるか | あなたの作業 |
| --- | --- | --- |
| 5:00 | 下書き作成 → 事実確認・ふりがなチェック → 確認用の Pull Request が届く | なし |
| 起きたら | Pull Request を開き、確認リストを見る | 5〜10分 |
| 確認できたら | **Merge** を押す → 数分でサイトに公開 | 1タップ |
| 7:00 以降 | X に自動投稿（7時前にマージした日は7時に投稿） | なし |

- GitHub のスマホアプリを入れると、通知から確認・マージまでスマホで完結します。
- 直したい所は、Pull Request の「Files changed」→ `content/日付.json` の「…」→「Edit file」で直せます。
- タイトルに「⚠️要確認」が付いた日は、二重チェックで気になる点が見つかっています。本文の「AI による事実確認」「ふりがなの読みチェック」を必ず見てください。

---

## はじめの設定

### 1. GitHub
1. 新しいリポジトリを **Public** で作る（例：`jijitane`）
2. このフォルダの中身をすべてアップロード（`.github` フォルダも忘れずに）
3. **Settings → Pages**：Source を「GitHub Actions」
4. **Settings → Actions → General**：
   - Workflow permissions：「Read and write permissions」
   - 「Allow GitHub Actions to create and approve pull requests」にチェック

### 2. Claude とつなぐ（どちらか1つ）

**A. サブスク版（おすすめ：Claude の Pro / Max プランの範囲で動く。API 料金なし）**
1. パソコンに Node.js を入れ、ターミナルで `npm install -g @anthropic-ai/claude-code`
2. `claude setup-token` を実行 → ブラウザで Claude にログイン → 表示された長いトークン（`sk-ant-oat01-` で始まる）をコピー
3. GitHub の **Settings → Secrets and variables → Actions → Secrets** に `CLAUDE_CODE_OAUTH_TOKEN` として登録

- 毎朝の作成は、あなたのプランの利用枠（Claude Code の使用量）から使われます。朝5時に動くので、日中の利用にはほぼ影響しません。
- トークンには有効期限があります。期限が近づいたら、もう一度 `claude setup-token` を実行して登録し直してください。
- 動かなくなった日は、Pull Request が届きません。Actions の実行ログを確認してください。

**B. API 版（API の従量課金。月20ドル前後）**
1. https://platform.claude.com でクレジットを購入（Max・Team プランなら毎月の無料クレジットを受け取れます）
2. 「Limits」で月の利用上限を設定し、組織の設定で **Web search を有効にする**
3. API キーを Secrets に `ANTHROPIC_API_KEY` として登録

両方登録した場合は、サブスク版が使われます。

### 3. 独自ドメイン（例：jijitane.jp）
1. ドメイン会社で取得
2. ドメイン会社の DNS 設定に次を追加

   | 種類 | ホスト名 | 値 |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | （GitHubのユーザー名）.github.io |

3. GitHub の **Settings → Pages → Custom domain** にドメインを入力 → 反映後「Enforce HTTPS」にチェック
4. GitHub の個人設定 **Settings → Pages** でドメインを「Verify」（のっとり防止）
5. `site.config.json` の `siteUrl` を自分のドメインに書きかえる

ドメインを取る前は、`site.config.json` の `siteUrl` を `https://（ユーザー名）.github.io/（リポジトリ名）` にしておけば、そのまま公開できます。

### 4. X（旧Twitter）
1. サイト用の X アカウントを作る（例：@jijitane）
2. https://developer.x.com でアプリを作り、App permissions を **Read and write** にする
3. その**あとで** Access Token と Secret を発行
4. 従量課金のクレジットを購入（月 1,000 円前後の見込み）
5. Secrets に `X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_SECRET` を登録
6. `site.config.json` の `xHandle` にアカウント名（@なし）を入れる

キーを登録するまでは、投稿せずにログに文面だけ出します。

### 5. 試運転
**Actions → 下書きを作る → Run workflow** で、すぐに下書きの Pull Request が届きます。
最初の1〜2週間は毎日の記事をていねいに確認し、気になる書きぶりがあれば `prompts/system.md`（作成ルール）を直していきます。

---

## 設定ファイル（site.config.json）

| 項目 | 内容 |
| --- | --- |
| `siteName` / `brandPrefix` / `brandMain` | サイト名（ヘッダーは「中受」の札＋名前） |
| `tagline` / `taglineShort` | キャッチコピー |
| `siteUrl` | サイトのURL |
| `postHourJst` | X に投稿する時刻（日本時間） |
| `model` | 使う Claude のモデル |
| `xHandle` / `lineUrl` | フォロー・登録ボタンのリンク先 |
| `ads.enabled` / `ads.client` / `ads.slots` | AdSense。審査に通ったら `enabled: true` と ID を入れる |
| `analytics.plausible` | アクセス解析（Plausible）を使う場合のドメイン |

GitHub の **Variables** で次も設定できます：`AUTO_PUBLISH`（`true` で確認なし公開。⚠️の日は止まる）、`CLAUDE_MODEL`、`SITE_URL`。

---

## 記事データの書き方（content/YYYY-MM-DD.json）

- `{漢字|かんじ}` → ふりがな
- `==大事な文==` → 蛍光ペン
- `**太字**`
- 訂正するときは、そのニュースに `"corrections": [{"date": "2026-10-10", "text": "〇〇を△△に直しました"}]` を足す

## フォルダの中身

| 場所 | 役割 |
| --- | --- |
| `content/` | 毎日の記事データ |
| `prompts/system.md` | Claude への作成ルール（選び方・書き方・図のルール） |
| `scripts/generate.mjs` | 下書きを作る |
| `scripts/factcheck.mjs` | 事実確認とふりがなチェック |
| `scripts/validate.mjs` / `scripts/review.mjs` | 記事データの形のチェック・確認メモ作成（サブスク版で使用） |
| `scripts/build.mjs` | サイトを組み立てる |
| `scripts/post-x.mjs` | X に投稿する |
| `src/` | デザイン・ページの形・読み上げ・SNS画像 |
| `.github/workflows/` | 毎朝の自動実行 |
| `state/posted.json` | X に投稿済みの記録 |

## 手元で動かす（任意）

```bash
npm install
npm run build                                   # dist/ にサイトができる
ANTHROPIC_API_KEY=... npm run generate          # 今日の下書き
ANTHROPIC_API_KEY=... npm run check             # 二重チェック
TARGET_DATE=2026-10-09 FORCE_POST=true DRY_RUN=true npm run post   # 投稿文の確認だけ
```
