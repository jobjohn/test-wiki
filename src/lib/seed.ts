import type { DatabaseSync } from "node:sqlite";
import { defaultAdminPassword, homePageTitle } from "./env";
import { hashPassword } from "./password";
import { keyOf, now } from "./text";

const WELCOME_BODY = `Wiki へようこそ。このページは自由に編集できます（右上の「編集」ボタン）。

## 使い方

- 右上の **新規ページ** からページを作成します
- ページは **フォルダ** に分けて整理できます。フォルダの中にフォルダを作って階層化できます（左のサイドバーにツリー表示）
- **タグ** を付けてページを分類できます
- 編集のたびに **履歴** が残り、差分の確認や過去の版への復元ができます
- 画面上部の検索ボックスで全文検索できます（\`/\` キーでフォーカス）

詳しい書き方は [[Markdown の書き方]] を参照してください。
`;

const MARKDOWN_GUIDE_BODY = `本文は GitHub 形式の Markdown で記述できます。

## 見出し

\`\`\`markdown
# 見出し1
## 見出し2
### 見出し3
\`\`\`

## Wiki リンク

- \`[[ページ名]]\` と書くと他のページへのリンクになります
- \`[[ページ名|表示名]]\` で表示するテキストを変えられます
- まだ存在しないページへのリンクは赤色で表示され、クリックするとそのページを作成できます（例: [[まだないページ]]）

## 装飾

| 書き方 | 表示 |
| --- | --- |
| \`**太字**\` | **太字** |
| \`*斜体*\` | *斜体* |
| \`~~取り消し線~~\` | ~~取り消し線~~ |
| \`\` \`コード\` \`\` | \`コード\` |

## リスト・チェックリスト

- [x] 完了したタスク
- [ ] 未完了のタスク

1. 番号付き
2. リスト

## コードブロック

\`\`\`ruby
def hello(name)
  puts "Hello, #{name}!"
end
\`\`\`

## 画像・ファイル

編集画面のテキストエリアに画像をドラッグ＆ドロップするか、クリップボードから貼り付けると自動でアップロードされます。

## 脚注

脚注も使えます[^1]。

[^1]: これが脚注です。
`;

/** 新規に作成したデータベースに、設定・初期ユーザー wikiadmin・案内ページを登録する */
export function seedFreshDatabase(db: DatabaseSync) {
  const timestamp = now();

  db.prepare("INSERT INTO settings (id) VALUES (1)").run();
  db.prepare(
    `INSERT INTO users (username, username_key, display_name, password_hash, role, must_change_password, created_at, updated_at)
     VALUES ('wikiadmin', 'wikiadmin', 'Wiki 管理者', ?, 'admin', 1, ?, ?)`,
  ).run(hashPassword(defaultAdminPassword()), timestamp, timestamp);

  const insertFolder = db.prepare("INSERT INTO folders (name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?)");
  const insertPage = db.prepare(
    "INSERT INTO pages (title, title_key, body, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertRevision = db.prepare(
    "INSERT INTO revisions (page_id, number, title, body, summary, created_at) VALUES (?, 1, ?, ?, '初期ページ', ?)",
  );
  const insertTag = db.prepare("INSERT INTO tags (name, name_key) VALUES (?, ?) ON CONFLICT(name_key) DO NOTHING");
  const selectTag = db.prepare("SELECT id FROM tags WHERE name_key = ?");
  const insertTagging = db.prepare("INSERT INTO taggings (page_id, tag_id) VALUES (?, ?)");

  const helpFolder = Number(insertFolder.run("ヘルプ", keyOf("ヘルプ"), timestamp, timestamp).lastInsertRowid);
  const pages: { title: string; body: string; folderId: number | null; tags: string[] }[] = [
    { title: homePageTitle(), body: WELCOME_BODY, folderId: null, tags: ["はじめに"] },
    { title: "Markdown の書き方", body: MARKDOWN_GUIDE_BODY, folderId: helpFolder, tags: ["はじめに", "ヘルプ"] },
  ];
  for (const page of pages) {
    const pageId = Number(
      insertPage.run(page.title, keyOf(page.title), page.body, page.folderId, timestamp, timestamp).lastInsertRowid,
    );
    insertRevision.run(pageId, page.title, page.body, timestamp);
    for (const tag of page.tags) {
      insertTag.run(tag, keyOf(tag));
      const row = selectTag.get(keyOf(tag)) as { id: number };
      insertTagging.run(pageId, row.id);
    }
  }
}
