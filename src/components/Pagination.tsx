import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function Pagination({ basePath, params = {}, page, hasNext }: { basePath: string; params?: Record<string, string>; page: number; hasNext: boolean }) {
  if (page <= 1 && !hasNext) return null;
  const href = (n: number) => `${basePath}?${new URLSearchParams({ ...params, page: String(n) })}`;
  return (
    <PaginationRoot className="mt-6 justify-start">
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1)} />
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationLink href={href(page)} isActive aria-label={`${page} ページ目`}>
            {page}
          </PaginationLink>
        </PaginationItem>
        {hasNext && (
          <PaginationItem>
            <PaginationNext href={href(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </PaginationRoot>
  );
}
