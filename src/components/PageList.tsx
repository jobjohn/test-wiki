import { Clock, FileText } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { type Page, tagsForPages } from "@/lib/pages";
import { Tags } from "./Tags";

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
  return (
    <>
      {excerpt.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-highlight/25 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function PageList({ pages, query }: { pages: Page[]; query?: string }) {
  const tags = tagsForPages(pages.map((p) => p.id));
  return (
    <ul className="divide-y">
      {pages.map((page) => (
        <li key={page.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="size-4 text-muted-foreground" aria-hidden />
            <Link href={`/pages/${page.id}`} className="font-semibold text-link hover:underline">
              {page.title}
            </Link>
            <Tags tags={tags.get(page.id) ?? []} />
          </div>
          {query && (
            <p className="text-sm text-muted-foreground">
              <Snippet body={page.body} query={query} />
            </p>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            {formatDateTime(page.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
