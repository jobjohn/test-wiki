import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Pagination({ basePath, params = {}, page, hasNext }: { basePath: string; params?: Record<string, string>; page: number; hasNext: boolean }) {
  if (page <= 1 && !hasNext) return null;
  const href = (n: number) => `${basePath}?${new URLSearchParams({ ...params, page: String(n) })}`;
  return (
    <nav className="pagination" aria-label="ページ送り">
      {page > 1 && (
        <Link href={href(page - 1)} className="button">
          <ArrowLeft size={18} aria-hidden />
          <span>前へ</span>
        </Link>
      )}
      <span className="muted">{page} ページ目</span>
      {hasNext && (
        <Link href={href(page + 1)} className="button">
          <span>次へ</span>
          <ArrowRight size={18} aria-hidden />
        </Link>
      )}
    </nav>
  );
}
