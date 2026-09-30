import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { createPage } from "@/lib/pages";

describe("Markdown", () => {
  it("存在するページと存在しないページへの Wiki リンクを作る", () => {
    getDb();
    const id = createPage({ title: "Existing", body: "", folderId: null, position: 0, tags: "", userId: null });
    const html = renderMarkdown("[[existing]] と [[Missing|ラベル]] と [[A B]]");
    expect(html).toContain(`<a href="/pages/${id}" class="wikilink">existing</a>`);
    expect(html).toContain(`href="/pages/new?title=Missing"`);
    expect(html).toContain(`class="wikilink-missing">ラベル</a>`);
    expect(html).toContain(`href="/pages/new?title=A%20B"`);
  });

  it("コード内の Wiki リンクは変換しない", () => {
    const html = renderMarkdown("`[[Inline]]`\n\n```\n[[Block]]\n```\n");
    expect(html).not.toContain("<a ");
    expect(html).toContain("[[Inline]]");
  });

  it("生の HTML・危険なリンク・イベント属性を出力しない", () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))\n\n<a href="javascript:alert(2)" onclick="x()">y</a>',
    );
    expect(html).not.toMatch(/<script|onerror|onclick|javascript:/i);
  });

  it("GFM の表・タスクリスト・取り消し線・脚注に対応する", () => {
    const html = renderMarkdown("| a |\n| - |\n| b |\n\n- [x] done\n- [ ] todo\n\n~~x~~\n\n脚注[^1]\n\n[^1]: 本文");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<del>x</del>");
    expect(html).toContain("脚注");
    expect(html).toContain('id="footnote-label"');
  });

  it("改行をそのまま改行として扱う", () => {
    expect(renderMarkdown("a\nb")).toContain("a<br>\nb");
  });

  it("見出しに id を付け（日本語可）、コードをハイライトする", () => {
    const html = renderMarkdown("## 使い方\n\n```ruby\nputs 1\n```\n");
    expect(html).toContain('<h2 id="使い方">使い方</h2>');
    expect(html).toContain("hljs-");
    expect(html).toContain("language-ruby");
  });

  it("画像とファイルへの相対リンクを保持する", () => {
    const html = renderMarkdown("![図](/files/1/a.png) [資料](/files/2/b.pdf)");
    expect(html).toContain('<img src="/files/1/a.png" alt="図">');
    expect(html).toContain('href="/files/2/b.pdf"');
  });
});
