import { Fragment } from "react";
import { Clock, FileText } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { type Page, tagsForPages } from "@/lib/pages";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Tags } from "./Tags";
import { Button } from "@/components/ui/button";

/** 検索語の周辺テキストを抜き出して、該当箇所を強調表示する */
function Snippet({ body, query, radius = 60 }: { body: string; query: string; radius?: number }) {
  const text = body.replace(/\s+/g, " ");
  const terms = query.split(/[\s　]+/).filter(Boolean);
  const lower = text.toLowerCase();
  const hits = terms.map((t) => lower.indexOf(t.toLowerCase())).filter((i) => i >= 0);
  const index = hits.length ? Math.min(...hits) : 0;
  const start = Math.max(index - radius, 0);
  const excerpt = `${start > 0 ? "…" : ""}${text.slice(start, start + radius * 3)}${start + radius * 3 < text.length ? "…" : ""}`;
  if (!terms.length) return <>{excerpt}</>;

  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{excerpt.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}

export function PageList({ pages, query }: { pages: Page[]; query?: string }) {
  const tags = tagsForPages(pages.map((p) => p.id));
  return (
    <ItemGroup>
      {pages.map((page, i) => (
        <Fragment key={page.id}>
          {i > 0 && <ItemSeparator />}
          <Item size="sm" className="px-0">
            <ItemMedia variant="icon">
              <FileText aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="flex-wrap">
                <Button variant="link" asChild className="h-auto p-0">
                  <Link href={`/pages/${page.id}`}>{page.title}</Link>
                </Button>
                <Tags tags={tags.get(page.id) ?? []} />
              </ItemTitle>
              {query && (
                <ItemDescription className="line-clamp-none">
                  <Snippet body={page.body} query={query} />
                </ItemDescription>
              )}
              <ItemDescription className="flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {formatDateTime(page.updatedAt)}
              </ItemDescription>
            </ItemContent>
          </Item>
        </Fragment>
      ))}
    </ItemGroup>
  );
}
