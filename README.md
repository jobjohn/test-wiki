# Wiki

Next.js 製のシンプルで実用的な Wiki です。Docker があればコマンド 1 つで起動できます。

## 起動方法

```bash
docker compose up -d --build
```

ブラウザで <http://localhost:3000> を開き、初期ユーザーでログインしてください。

| ユーザー名 | 初期パスワード |
| --- | --- |
| `wikiadmin` | `wikiadmin`（環境変数 `WIKI_ADMIN_PASSWORD` で変更可） |

初回ログイン時に **初期設定画面** が表示され、次の項目を設定します（あとから「Wiki の設定」で変更できます）。

1. Wiki の名前と説明（どんな Wiki か）
2. カラーテーマ
3. 管理者パスワードの変更

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
- プレビュー、目次、被リンク表示、Markdown ダウンロード、最近の更新
- ショートカット: `/` で検索、編集画面で `Ctrl/⌘ + S` 保存

### 見た目

- アイコンは [Lucide](https://lucide.dev)（`lucide-react`）で統一
- **3 色（ベースカラー・メインカラー・差し色）** で全体の配色が決まるカラーテーマ。標準はベース白・メイン青・差し色緑。7 種類のプリセットのほか、色を自由に選べるカスタムテーマに対応（設定画面でリアルタイムにプレビュー）
- 表示モード: システムに合わせる / ライト / ダーク
- スマートフォン対応

### ユーザーとセキュリティ

- ユーザー管理（管理者）。権限は **管理者 / 編集者 / 閲覧者**
- **二段階認証（MFA）**: 認証アプリ（Google Authenticator など）のパスコードによるログイン。各ユーザーが任意で設定でき、管理者は全員に必須化することも可能。スマートフォン紛失時用のバックアップコード付き
- 「ログインなしで閲覧を許可」設定（閲覧のみ公開、編集はログイン必須）
- ログイン試行回数の制限、パスワード変更時に他の端末のログインを無効化
- Markdown の HTML は安全な要素だけに制限。アップロードされた SVG / HTML はブラウザで実行されないようダウンロード扱い

## 設定

Wiki の名前・説明・カラーテーマ・アクセス設定は、管理者でログインして画面右上のメニュー →「Wiki の設定」から変更します。

起動時の設定は `.env.example` を `.env` にコピーして編集します。

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `WIKI_PORT` | `3000` | 公開するポート |
| `WIKI_ADMIN_PASSWORD` | `wikiadmin` | 初期ユーザー `wikiadmin` の初期パスワード（最初の起動前に設定） |
| `WIKI_HOME_PAGE` | `ホーム` | ホーム画面に表示するページのタイトル |
| `TZ` | `Asia/Tokyo` | タイムゾーン |
| `FORCE_SSL` | （なし） | `true` にすると Cookie に Secure を付けます（リバースプロキシで HTTPS 化する場合） |
| `SECRET_KEY_BASE` | 自動生成 | 二段階認証の情報を暗号化する鍵。未設定の場合は初回に生成し、データ領域に保存します |

設定を変更したら `docker compose up -d` で反映されます。

リバースプロキシの背後で使う場合は、`Host`（または `X-Forwarded-Host`）を元のホスト名のまま渡してください。

### ログインできなくなった場合

管理者のパスワードを忘れた場合や、二段階認証の端末を紛失した場合は、次のコマンドでリセットできます（次回ログイン時にパスワードの変更を求められます）。

```bash
# ランダムなパスワードを発行
docker compose exec wiki node scripts/reset-password.mjs wikiadmin

# パスワードを指定し、二段階認証も解除する
docker compose exec wiki node scripts/reset-password.mjs wikiadmin 新しいパスワード --reset-mfa
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
npm run dev        # http://localhost:3000（データは ./storage に保存）
npm test           # テスト
npm run typecheck  # 型チェック
```

## 構成

- Next.js 16（App Router / Server Actions）/ React 19 / TypeScript
- データベース: SQLite（Node.js 標準の `node:sqlite`。ネイティブ拡張なし）
- 認証: セッション Cookie + scrypt、二段階認証: TOTP（RFC 6238）を自前実装、シークレットは AES-256-GCM で暗号化
- Markdown: unified（remark / rehype）+ highlight.js、HTML は `rehype-sanitize` で制限
- ファイル保存: ローカルディスク（`/data/files`）
- アイコン: [lucide-react](https://lucide.dev)
