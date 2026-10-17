# Wiki

Next.js 製のシンプルで実用的な Wiki です。Docker があればコマンド 1 つで起動できます。

## 起動方法

まず、初期管理者のメールアドレスとパスワードを `.env` に書きます（未設定のままでは起動できません）。

```bash
cp .env.example .env
# .env の WIKI_ADMIN_EMAIL と WIKI_ADMIN_PASSWORD（8 文字以上）を書き換える
docker compose up -d --build
```

ブラウザで <http://localhost:3000> を開き、`.env` に書いたメールアドレスとパスワードでログインしてください。初回起動時（データベースが空のとき）に、この内容で管理者が作られます。

初回ログイン時に **初期設定画面** が表示され、Wiki の名前と説明（どんな Wiki か）を設定します（あとから「Wiki の設定」で変更できます）。

停止する場合:

```bash
docker compose down
```

データ（ページ・履歴・アップロードファイル）は Docker ボリューム `wiki-data` に保存されるため、コンテナを作り直しても消えません。
`docker compose down -v` を実行するとボリュームごと削除されます。

## 主な機能

- **フォルダ**: フォルダの中にフォルダを作って何階層でも整理できます（サイドバーにツリー表示）。名前変更・移動・削除（中身は 1 つ上へ移動）に対応
- **Markdown（GitHub 形式）**: 表、チェックリスト、脚注、コードのシンタックスハイライト。改行はそのまま改行になります
- **Wiki リンク**: `[[ページ名]]` / `[[ページ名|表示名]]`。未作成のページは赤字で表示され、クリックで作成できます
- **タグ**、**全文検索**（日本語対応・該当箇所を強調）
- **変更履歴**: 編集者つきで版を保存。差分表示、過去の版への復元
- **同時編集の検知**: 他の人が先に保存していた場合は上書きせず警告し、自分の編集内容を残したまま最新の内容を読み込めます
- **ファイル添付**: ドラッグ＆ドロップ、クリップボードからの画像貼り付け
- **リンク集**: チーム全員で共有する URL の一覧（サイドバーの「リンク集」）。URL を入力するとサイトのタイトルとファビコンを自動取得し、タグ（Wiki ページと共通）・Markdown の説明を付けて登録できます。タイトル・URL・説明の検索、タグでの絞り込み、新着順・更新順・タイトル順の並び替えに対応。同じ URL は重複して登録できません
- **ゴミ箱**: ページ・リンク・ファイルを削除すると、完全には消さずにゴミ箱（サイドバーの「ゴミ箱」）へ移します。30 日間は元に戻せ（ページは履歴・タグ・元の URL ごと復元）、過ぎたものは自動で完全に削除されます。見られるのも復元できるのも編集できるユーザーだけ（「ログインなしで閲覧を許可」でも見えません）。同じタイトルのページや同じ URL のリンクが既にあるときは復元できません。完全削除とゴミ箱を空にする操作は管理者だけが行えるので、秘密情報を誤って書いてしまった場合は、管理者がすぐに完全削除してください（ページの履歴・ファイルの実体も消えます）
- プレビュー、目次、被リンク表示、Markdown ダウンロード、最近の更新
- ショートカット: `/` で検索、編集画面で `Ctrl/⌘ + S` 保存

### 見た目

- UI は [shadcn/ui](https://ui.shadcn.com)（Tailwind CSS v4 + Radix UI）。ボタン・フォーム・ダイアログ・ドロップダウン・タブ・通知などの部品は `src/components/ui/` にあり、`components.json` も含まれているので、`npx shadcn@latest add <部品名>` で追加できます
- アイコンは [Lucide](https://lucide.dev)（`lucide-react`）で統一
- 画面では shadcn/ui の部品をそのまま使い、色・角丸・影などの見た目を上書きしません（画面側で指定するのは配置だけ）
- 配色は shadcn/ui のプリセット `b6rtA2I08`（スタイル nova・角丸 none・ベース olive・テーマ green）で固定です。差し色（`--highlight`）は Button・Badge の `highlight` バリアントで使います
- 表示モード: システムに合わせる / ライト / ダーク
- スマートフォン対応

### ユーザーとセキュリティ

- **ログイン**: メールアドレスとパスワードで行います。複数のユーザーを登録できます
- **ロール**: **一般**（ページの閲覧・作成・編集）と **管理者**（加えてユーザー管理と Wiki の設定）
- **ステータス**: **有効 / 無効**。無効にしたユーザーはログインできず、ログイン中の端末からもログアウトされます（ユーザーは削除せずに残せます）
- 有効な管理者が 1 人もいなくなる変更（最後の管理者の降格・無効化・削除）はできません
- **二段階認証（MFA）**: 認証アプリ（Google Authenticator など）のパスコードによるログイン。各ユーザーが任意で設定でき、管理者は全員に必須化することも可能。スマートフォン紛失時用のバックアップコード付き
- 「ログインなしで閲覧を許可」設定（閲覧のみ公開、編集はログイン必須）
- ログイン試行回数の制限、パスワード変更時に他の端末のログインを無効化
- Markdown の HTML は安全な要素だけに制限。アップロードされた SVG / HTML はブラウザで実行されないようダウンロード扱い
- リンク集は「ログインなしで閲覧を許可」の設定にかかわらず、ログインした人だけが使えます。サイトの情報の取得はサーバーから行い、社内ネットワーク（localhost・プライベート・リンクローカルなどのアドレス）へは接続しません（リダイレクト先も同様に検査、タイムアウト 5 秒・読み込み 512KB まで）

### AI から使う（MCP サーバー・既定は読み取り専用）

Wiki の内容を、MCP（Model Context Protocol）対応の AI クライアントから検索・参照できます。既定では書き込みはできません（書き込みを許可する手順は下記）。

1. 「アカウント」画面の「アクセストークン（MCP）」で、名前・権限（読み取り / 読み取り・書き込み）・有効期限（30 日 / 90 日 / 1 年 / 無期限）を選んでトークンを発行します。トークンは発行直後に 1 回だけ表示されます
2. AI クライアントに登録します（Claude Code の例）

```bash
claude mcp add --transport http wiki https://<WikiのURL>/api/mcp --header "Authorization: Bearer <トークン>"
```

- **使えるツール**: `search_pages`（ページ検索）、`get_page`（本文の取得。長い本文は `offset` / `max_chars` で分割）、`list_pages`（フォルダとページの一覧）、`recent_changes`（最近の更新）、`list_tags`、`search_bookmarks`、`get_bookmark`（リンク集）
- **トークンの管理**: 1 人 20 個まで。アカウント画面でいつでも取り消せます（本人のものだけ）。期限切れ・取り消し・ユーザーの無効化や削除で使えなくなり、二段階認証が必須の設定でユーザーが未設定の場合や、パスワード変更が必要な場合も拒否されます。DB にはハッシュだけを保存します
- **安全対策**: 「ログインなしで閲覧を許可」の設定に関係なくトークンが必須、トークンごとに 1 分 120 回まで、リクエスト本文は 1MB まで、ブラウザからの別サイトの `Origin` は拒否します（`Origin` の検査は、リバースプロキシが付ける `X-Forwarded-Host` を信頼する前提で、既存の画面の CSRF 対策と同じです）。Wiki の本文やリンクの説明は利用者が書いた内容であり、AI への指示として扱わないよう、サーバーの説明に明記しています
- トークンはそのユーザーが閲覧できる内容すべてを読めるので、他人に渡さないでください

#### 書き込みを有効にする

AI からページやリンクを作成・更新できるようにするには、次をすべて行います。

1. 管理者が「Wiki の設定」で「MCP からの書き込みを許可」をオンにします（既定はオフ）
2. 「アカウント」画面で、権限に「読み取り・書き込み」を選んでトークンを発行します（有効期限は 30 日 / 90 日 / 1 年のみ。無期限にはできません）

書き込みツールは、**(a) 設定が有効、(b) トークンの権限が write、(c) そのユーザーが編集できる** の 3 条件がそろったときだけ提供されます。満たさないトークンには `tools/list` に出ず、呼び出しても拒否します（設定が途中でオフにされた場合も、その場で拒否します。発行済みの write トークンは残りますが、設定がオフの間は読み取りしか使えません）。

- **書き込みツール**: `create_page`（作成。同じタイトルはエラー）、`update_page`（`lock_version` が必須。省略した項目は今の値のまま。**`body` は本文全体を置き換える**ので、先に `get_page` で `hasMore=false` になるまで読む）、`add_bookmark`（`title` を省略すると URL から取得。同じ URL はエラー）、`update_bookmark`。入力チェック・一意性・楽観ロックは画面と同じです。応答には本文を含めません。削除はできません
- **誤更新の防止**: `lock_version` が古いと更新せず、最新の `lockVersion` を返します。元の本文が 2000 文字以上で、新しい本文が半分未満になる更新は、`confirm_shrink: true` がない限り拒否します（長い本文を途中までしか読まずに送った場合に、後半が消えるのを防ぐため）
- **記録**: MCP 経由の版には、変更履歴と「最近の更新」に「MCP 経由」と表示されます。成功した書き込みは、トークン名・ユーザー・ツール・対象とともに監査ログ（`api_write_logs`）に残ります（現在は記録のみで、画面からは見られません。データベースを直接参照してください）
- **回数制限**: 書き込みはトークンごとに 1 分 20 回まで（読み取りを含む全体の 120 回/分とは別）。`add_bookmark` のタイトル取得は、画面と同じくユーザーごとに 1 分 30 回までです
- **注意**: write トークンを持つ AI は、あなたの権限でページやリンクを書き換えられます。信頼できるクライアントだけに使い、使わなくなったトークンは取り消してください。Wiki の本文やリンク先に書かれた指示で書き込まないよう、ツールの説明に明記していますが、AI が誤って書き込む可能性はゼロにはなりません。ページの更新（`update_page`）はページの履歴から元に戻せますが、リンクの更新（`update_bookmark`）には履歴がなく、元に戻せません

## 設定

Wiki の名前・説明・表示モード・アクセス設定は、管理者でログインして画面右上のメニュー →「Wiki の設定」から変更します。

起動時の設定は `.env.example` を `.env` にコピーして編集します。`WIKI_ADMIN_EMAIL` と `WIKI_ADMIN_PASSWORD` は必須です。

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `WIKI_PORT` | `3000` | 公開するポート |
| `WIKI_ADMIN_EMAIL` | （必須） | 初期管理者のメールアドレス。データベースが空のときだけ使います（作成後に変えても、既存の管理者は変わりません） |
| `WIKI_ADMIN_PASSWORD` | （必須） | 初期管理者のパスワード（8 文字以上）。同上 |
| `WIKI_HOME_PAGE` | `ホーム` | ホーム画面に表示するページのタイトル |
| `TZ` | `Asia/Tokyo` | タイムゾーン |
| `FORCE_SSL` | （なし） | `true` にすると Cookie に Secure を付けます（リバースプロキシで HTTPS 化する場合） |
| `SECRET_KEY_BASE` | 自動生成 | 二段階認証の情報を暗号化する鍵。未設定の場合は初回に生成し、データ領域に保存します |

設定を変更したら `docker compose up -d` で反映されます。

リバースプロキシの背後で使う場合は、`Host`（または `X-Forwarded-Host`）を元のホスト名のまま渡してください。

### ログインできなくなった場合

管理者のパスワードを忘れた場合や、二段階認証の端末を紛失した場合は、次のコマンドでリセットできます（次回ログイン時にパスワードの変更を求められます）。管理者が全員無効になってしまった場合は `--activate` で有効に戻せます。

```bash
# ランダムなパスワードを発行
docker compose exec wiki node scripts/reset-password.mjs you@example.com

# パスワードを指定し、二段階認証も解除する
docker compose exec wiki node scripts/reset-password.mjs you@example.com 新しいパスワード --reset-mfa

# 無効になっているユーザーを有効に戻す
docker compose exec wiki node scripts/reset-password.mjs you@example.com 新しいパスワード --activate
```

## バックアップ

```bash
docker compose cp wiki:/data ./backup
```

SQLite データベース（`wiki.sqlite3`）とアップロードファイル（`files/`）が含まれます。復元するときは、`docker compose down` のあとでボリュームに書き戻してください。

## 開発

Node.js 22.13 以上が必要です。

```bash
npm install
# 初期管理者を .env.local に書く（Next.js が自動で読み込みます）
printf 'WIKI_ADMIN_EMAIL=you@example.com\nWIKI_ADMIN_PASSWORD=change-me-please\n' > .env.local
npm run dev        # http://localhost:3000（データは ./storage に保存）
npm test           # テスト
npm run typecheck  # 型チェック
npm run build && npm run test:e2e  # E2E スモークテスト（Playwright。初回は npx playwright install chromium）
npm run storybook  # 部品の一覧（http://localhost:6006）
```

### CI

GitHub Actions（`.github/workflows/ci.yml`）が、master 向けの PR と master への push で、型チェック・テスト（`check`）、本番ビルド（`build`）、Storybook のビルド（`storybook`）、ブラウザでの E2E スモークテスト（`e2e`）を自動で実行します。Docker イメージの起動確認（`docker`）は、master への push と、Dockerfile などを変えた PR のときだけ動きます。
GitHub のブランチ保護で `check` と `build` を必須にすると安全です。

### Storybook（部品の一覧）

画面で使っている部品を、状態ごとに確認できます。ツールバーで、ライト／ダークを切り替えられます。

```bash
npm run storybook         # 開発用サーバー http://localhost:6006
npm run build-storybook   # 静的なサイトとして storybook-static/ に出力
```

- 部品は `部品名.stories.tsx` として、部品と同じ場所に置きます（`src/components/` の部品にストーリーがないと、`npm test` が失敗します）。
- フォームのサーバーアクションとデータベースは、Storybook ではモックに差し替わっています（`.storybook/main.ts`）。送信しても何も保存されません。
- 見た目を統一していく計画は [docs/design-system-plan.md](docs/design-system-plan.md) にあります。

## 構成

- Next.js 16（App Router / Server Actions）/ React 19 / TypeScript
- UI: shadcn/ui（nova スタイル・角丸なし）/ Tailwind CSS v4 / Radix UI / sonner（通知）
- データベース: SQLite（Node.js 標準の `node:sqlite`。ネイティブ拡張なし）
- 認証: セッション Cookie + scrypt、二段階認証: TOTP（RFC 6238）を自前実装、シークレットは AES-256-GCM で暗号化
- Markdown: unified（remark / rehype）+ highlight.js、HTML は `rehype-sanitize` で制限
- ファイル保存: ローカルディスク（`/data/files`）
- アイコン: [lucide-react](https://lucide.dev)

## ライセンス

[MIT License](LICENSE)
