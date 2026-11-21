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

interface HtmlElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<HtmlElement | { type: string; value?: string; tagName?: string; children?: HtmlElement["children"]; properties?: Record<string, unknown> }>;
}

function elementText(node: { children?: HtmlElement["children"] }): string {
  let text = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") text += child.value ?? "";
    else if (child.type === "element" && child.tagName !== "input") text += elementText(child);
  }
  return text.replace(/\s+/g, " ").trim();
}

function languageOf(properties: Record<string, unknown> | undefined): string | undefined {
  const value = properties?.className;
  const classes = Array.isArray(value) ? value.map(String) : String(value ?? "").split(/\s+/);
  const found = classes.find((name) => name.startsWith("language-"));
  return found ? found.slice("language-".length) : undefined;
}

/** チェックボックスの名前、コードと表のキーボード到達、空の見出しを補う（sanitize の後なので属性は残る） */
function rehypeMarkdownA11y() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, "element", (node, _index, parent) => {
      const element = node as HtmlElement;
      element.properties ??= {};
      if (element.tagName === "input" && element.properties.type === "checkbox" && !element.properties.ariaLabel) {
        const owner = parent as HtmlElement | undefined;
        const label = owner?.type === "element" ? elementText(owner) : "";
        element.properties.ariaLabel = label || "チェック項目";
      }
      if (element.tagName === "pre") {
        element.properties.tabIndex = 0;
        const code = element.children.find((child) => child.type === "element" && child.tagName === "code");
        const language = languageOf(code && "properties" in code ? code.properties : undefined);
        element.properties.ariaLabel = language ? `${language} のコード` : "コード";
      }
      if (element.tagName === "th" && !elementText(element)) element.properties.ariaLabel = "見出しなし";
      if (element.tagName === "table" && !element.properties.ariaLabel) {
        element.properties.tabIndex = 0;
        element.properties.ariaLabel = "表";
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkWikiLinks)
  .use(remarkRehype, { footnoteLabel: "脚注", footnoteBackLabel: "本文に戻る" })
  .use(rehypeSlug)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeHighlight, { detect: false })
  .use(rehypeMarkdownA11y)
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
