import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({ basePath, params = {}, page, hasNext }: { basePath: string; params?: Record<string, string>; page: number; hasNext: boolean }) {
  if (page <= 1 && !hasNext) return null;
  const href = (n: number) => `${basePath}?${new URLSearchParams({ ...params, page: String(n) })}`;
  return (
    <nav className="mt-6 flex items-center gap-3" aria-label="ページ送り">
      {page > 1 && (
        <Button variant="outline" asChild>
          <Link href={href(page - 1)}>
            <ArrowLeft aria-hidden />
            前へ
          </Link>
        </Button>
      )}
      <span className="text-sm text-muted-foreground">{page} ページ目</span>
      {hasNext && (
        <Button variant="outline" asChild>
          <Link href={href(page + 1)}>
            次へ
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </nav>
  );
}
