# Wiki

Ruby on Rails 製のシンプルで実用的な Wiki です。Docker があればコマンド 1 つで起動できます。

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

データ（ページ・履歴・アップロードファイル）は Docker ボリューム `wiki-storage` に保存されるため、コンテナを作り直しても消えません。
`docker compose down -v` を実行するとボリュームごと削除されます。

## 主な機能

- **フォルダ**: フォルダの中にフォルダを作って何階層でも整理できます（サイドバーにツリー表示）。名前変更・移動・削除（中身は 1 つ上へ移動）に対応
- **Markdown（GitHub 形式）**: 表、チェックリスト、脚注、コードのシンタックスハイライト。改行はそのまま改行になります
- **Wiki リンク**: `[[ページ名]]` / `[[ページ名|表示名]]`。未作成のページは赤字で表示され、クリックで作成できます
- **タグ**、**全文検索**（日本語対応・該当箇所を強調）
- **変更履歴**: 編集者つきで版を保存。差分表示、過去の版への復元
- **同時編集の検知**: 他の人が先に保存していた場合は上書きせず警告
- **ファイル添付**: ドラッグ＆ドロップ、クリップボードからの画像貼り付け
- プレビュー、目次、被リンク表示、Markdown ダウンロード、最近の更新
- ショートカット: `/` で検索、編集画面で `Ctrl/⌘ + S` 保存

### 見た目

- アイコンは [Lucide](https://lucide.dev) で統一
- **3 色（ベースカラー・メインカラー・差し色）** で全体の配色が決まるカラーテーマ。標準はベース白・メイン青・差し色緑。7 種類のプリセットのほか、色を自由に選べるカスタムテーマに対応（設定画面でリアルタイムにプレビュー）
- 表示モード: システムに合わせる / ライト / ダーク
- スマートフォン対応

### ユーザーとセキュリティ

- ユーザー管理（管理者）。権限は **管理者 / 編集者 / 閲覧者**
- **二段階認証（MFA）**: 認証アプリ（Google Authenticator など）のパスコードによるログイン。各ユーザーが任意で設定でき、管理者は全員に必須化することも可能。スマートフォン紛失時用のバックアップコード付き
- 「ログインなしで閲覧を許可」設定（閲覧のみ公開、編集はログイン必須）
- ログイン試行回数の制限、パスワード変更時に他の端末のログインを無効化

## 設定

Wiki の名前・説明・カラーテーマ・アクセス設定は、管理者でログインして画面右上のメニュー →「Wiki の設定」から変更します。

起動時の設定は `.env.example` を `.env` にコピーして編集します。

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `WIKI_PORT` | `3000` | 公開するポート |
| `WIKI_ADMIN_PASSWORD` | `wikiadmin` | 初期ユーザー `wikiadmin` の初期パスワード（最初の起動前に設定） |
| `WIKI_HOME_PAGE` | `ホーム` | ホーム画面に表示するページのタイトル |
| `TZ` | `Asia/Tokyo` | タイムゾーン |
| `FORCE_SSL` | （なし） | `true` にすると HTTPS を強制します（リバースプロキシで TLS 終端する場合） |
| `SECRET_KEY_BASE` | 自動生成 | 未設定の場合は初回起動時に生成し、ボリュームに保存します |

### ログインできなくなった場合

管理者のパスワードを忘れた場合や二段階認証の端末を紛失した場合は、次のコマンドでリセットできます。

```bash
docker compose exec wiki bin/rails runner 'u = User.find_by_username("wikiadmin"); u.update!(password: "wikiadmin", must_change_password: true); u.disable_mfa!'
```

## バックアップ

```bash
docker compose cp wiki:/rails/storage ./backup
```

SQLite データベース（`production.sqlite3`）とアップロードファイル（`files/`）が含まれます。

## 開発

Ruby 3.3 がインストールされた環境で:

```bash
bundle install
bin/rails db:prepare
bin/rails server   # http://localhost:3000
bin/rails test     # テスト
```

## 構成

- Ruby on Rails 8 / SQLite / Puma
- 認証: bcrypt、二段階認証: [rotp](https://github.com/mdp/rotp)（TOTP）
- Markdown: [commonmarker](https://github.com/gjtorikian/commonmarker)
- ファイル保存: Active Storage（ローカルディスク）
- アイコン: [Lucide](https://lucide.dev)（ISC License、`vendor/lucide` に同梱）
