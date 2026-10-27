"use client";

import { ListTree } from "lucide-react";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  text: string;
  level: number;
}

function readHeadings(target: string): Item[] {
  const headings = document.querySelectorAll<HTMLElement>(`${target} :is(h1, h2, h3)`);
  return [...headings].filter((h) => h.id).map((h) => ({ id: h.id, text: h.textContent?.trim() ?? "", level: Number(h.tagName[1]) }));
}

/** 本文の見出し（h1〜h3）から目次を作る。3 つ以上あるときだけ表示 */
export function Toc({ target }: { target: string }) {
  // 本文の DOM を外部ストアとして購読し、見出しが変わったら（ページ移動を含む）目次を作り直す。
  // スナップショットは比較できるよう JSON 文字列にする（サーバーとハイドレーション時は空）
  const subscribe = useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(readHeadings(target)),
    () => "[]",
  );
  const items = useMemo(() => JSON.parse(snapshot) as Item[], [snapshot]);

  if (items.length < 3) return null;
  return (
    <Card size="sm" className="mb-4 md:float-right md:ml-6 md:w-60">
      <nav aria-label="目次" className="contents">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <ListTree className="size-4" aria-hidden />
            目次
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-0.5 text-sm">
            {items.map((item) => (
              <li key={item.id} className={cn(item.level === 2 && "pl-2.5", item.level === 3 && "pl-5")}>
                <Button variant="link" asChild className="h-auto p-0">
                  <a href={`#${encodeURIComponent(item.id)}`}>{item.text}</a>
                </Button>
              </li>
            ))}
          </ol>
        </CardContent>
      </nav>
    </Card>
  );
}
