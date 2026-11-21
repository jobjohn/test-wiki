import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol className="grid gap-0.5 text-sm">
      {items.map((item) => (
        <li key={item.id} className={cn(item.level === 2 && "pl-2.5", item.level === 3 && "pl-5")}>
          <Button variant="link" asChild className="h-auto justify-start p-0 text-left whitespace-normal">
            <a href={`#${encodeURIComponent(item.id)}`}>{item.text}</a>
          </Button>
        </li>
      ))}
    </ol>
  );
}

/** 見出しが 3 つ以上あるときだけ目次を出す。狭い画面は折りたたみ、デスクトップは右カラムに sticky */
export function Toc({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;
  return (
    <>
      <details className="mb-4 rounded-lg border bg-card md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <ListTree className="size-4" aria-hidden />
          目次
        </summary>
        <nav aria-label="目次" className="px-3 pb-3">
          <TocList items={items} />
        </nav>
      </details>
      <nav
        aria-label="目次"
        className="sticky top-[calc(var(--header-height)+1.5rem)] hidden max-h-[calc(100svh-var(--header-height)-3rem)] overflow-y-auto md:block"
      >
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ListTree className="size-4" aria-hidden />
              目次
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TocList items={items} />
          </CardContent>
        </Card>
      </nav>
    </>
  );
}
