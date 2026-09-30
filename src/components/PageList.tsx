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
      {excerpt.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

export function PageList({ pages, query }: { pages: Page[]; query?: string }) {
  const tags = tagsForPages(pages.map((p) => p.id));
  return (
    <ul className="page-list">
      {pages.map((page) => (
        <li key={page.id}>
          <div className="page-list-main">
            <FileText size={16} className="muted" aria-hidden />
            <Link href={`/pages/${page.id}`} className="page-list-title">
              {page.title}
            </Link>
            <Tags tags={tags.get(page.id) ?? []} />
          </div>
          {query && (
            <p className="snippet">
              <Snippet body={page.body} query={query} />
            </p>
          )}
          <span className="muted small">
            <Clock size={12} aria-hidden /> {formatDateTime(page.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
