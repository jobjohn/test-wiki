# Wiki

Ruby on Rails 製のシンプルで実用的な Wiki です。Docker があればコマンド 1 つで起動できます。

## 起動方法

```bash
docker compose up -d --build
```

ブラウザで <http://localhost:3000> を開いてください。
初回起動時にデータベースと初期ページ（「ホーム」「Markdown の書き方」）が自動で作成されます。

停止する場合:

```bash
docker compose down
```

データ（ページ・履歴・アップロードファイル）は Docker ボリューム `wiki-storage` に保存されるため、コンテナを作り直しても消えません。
`docker compose down -v` を実行するとボリュームごと削除されます。

## 主な機能

- **Markdown（GitHub 形式）**: 表、チェックリスト、脚注、コードのシンタックスハイライトに対応。改行はそのまま改行として表示されます
- **Wiki リンク**: `[[ページ名]]` / `[[ページ名|表示名]]`。未作成のページは赤字で表示され、クリックで作成できます
- **ページの階層化**: 親ページを指定してツリー構造で整理（サイドバーに表示）。表示順も指定可能
- **タグ**: カンマ・空白区切りで複数付与。タグ一覧・タグ別ページ一覧
- **変更履歴**: 編集ごとに版を保存。差分表示、過去の版への復元
- **同時編集の検知**: 他の人が先に保存していた場合は上書きせず、自分の編集内容を残したまま警告
- **全文検索**: タイトル・本文を AND 検索し、該当箇所を強調表示（日本語対応）
- **ファイル添付**: 編集画面へのドラッグ＆ドロップ、クリップボードからの画像貼り付け
- **プレビュー**、目次の自動生成、被リンク（このページへのリンク）表示
- **Markdown ダウンロード**、最近の更新一覧
- ショートカット: `/` で検索、編集画面で `Ctrl/⌘ + S` 保存
- レスポンシブ対応（スマートフォン）、ダークモード対応
- 任意の **Basic 認証**

## 設定

`.env.example` を `.env` にコピーして編集すると、設定を変更できます。

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `WIKI_NAME` | `Wiki` | 画面に表示される Wiki 名 |
| `WIKI_PORT` | `3000` | 公開するポート |
| `WIKI_PASSWORD` | （なし） | 設定すると Basic 認証が有効になります |
| `WIKI_USERNAME` | `admin` | Basic 認証のユーザー名 |
| `WIKI_HOME_PAGE` | `ホーム` | トップページに表示するページのタイトル |
| `TZ` | `Asia/Tokyo` | タイムゾーン |
| `FORCE_SSL` | （なし） | `true` にすると HTTPS を強制します（リバースプロキシで TLS 終端する場合） |
| `SECRET_KEY_BASE` | 自動生成 | 未設定の場合は初回起動時に生成し、ボリュームに保存します |

設定を変更したら `docker compose up -d` で反映されます。

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
- Markdown: [commonmarker](https://github.com/gjtorikian/commonmarker)
- ファイル保存: Active Storage（ローカルディスク）
