import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";
import { extractToc } from "@/lib/toc";

describe("目次", () => {
  it("描画した見出しの id とテキストをサーバー側で取り出す", () => {
    const html = renderMarkdown("# 使い方\n\n## 手順\n\n### `code`\n");
    expect(extractToc(html)).toEqual([
      { id: "使い方", text: "使い方", level: 1 },
      { id: "手順", text: "手順", level: 2 },
      { id: "code", text: "code", level: 3 },
    ]);
  });

  it("見出しの記号をテキストに戻し、id の無いものは省く", () => {
    expect(extractToc('<h2 id="a-b">A &amp; B</h2><h3>なし</h3>')).toEqual([{ id: "a-b", text: "A & B", level: 2 }]);
    expect(extractToc("<p>本文だけ</p>")).toEqual([]);
  });
});
