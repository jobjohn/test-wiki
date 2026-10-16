import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Link, PhrasingContent, Root, Text } from "mdast";
import { pageIdsByTitle } from "./pages";
import { keyOf } from "./text";
import { extractWikiLinkTitles, WIKI_LINK } from "./wikilinks";

type Resolver = (title: string) => number | undefined;
let currentResolver: Resolver = () => undefined;

/** テキスト中の [[ページ名]] / [[ページ名|表示名]] をリンクに変換する（コードブロック内は対象外） */
function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined || parent.type === "link" || parent.type === "linkReference") return;
      const value = node.value;
      const matches = [...value.matchAll(WIKI_LINK)];
      if (!matches.length) return;

      const children: PhrasingContent[] = [];
      let last = 0;
      for (const match of matches) {
        const start = match.index ?? 0;
        if (start > last) children.push({ type: "text", value: value.slice(last, start) });
        const title = match[1].replace(/\s+/g, " ").trim();
        const label = (match[2] ?? match[1]).trim();
        const id = currentResolver(title);
        const link: Link = {
          type: "link",
          url: id ? `/pages/${id}` : `/pages/new?title=${encodeURIComponent(title)}`,
          children: [{ type: "text", value: label }],
          data: { hProperties: { className: [id ? "wikilink" : "wikilink-missing"] } },
        };
        children.push(link);
        last = start + match[0].length;
      }
      if (last < value.length) children.push({ type: "text", value: value.slice(last) });
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  // 見出しの id を目次のアンカーとして使うため、接頭辞は付けない
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    // 既定の className 許可（脚注の戻りリンク）に、Wiki リンクの class を加える
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter((entry) => !(Array.isArray(entry) && entry[0] === "className")),
      ["className", "data-footnote-backref", "wikilink", "wikilink-missing"],
    ] as NonNullable<SanitizeOptions["attributes"]>[string],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkWikiLinks)
  .use(remarkRehype, { footnoteLabel: "脚注", footnoteBackLabel: "本文に戻る" })
  .use(rehypeSlug)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeHighlight, { detect: false })
  .use(rehypeStringify);

/**
 * Markdown（GitHub 形式）を安全な HTML に変換する。
 * 生の HTML は出力されず、リンク先・属性も許可リストで制限される。
 */
export function renderMarkdown(source: string): string {
  const ids = pageIdsByTitle(extractWikiLinkTitles(source));
  currentResolver = (title) => ids.get(keyOf(title));
  try {
    return String(processor.processSync(source));
  } finally {
    currentResolver = () => undefined;
  }
}
