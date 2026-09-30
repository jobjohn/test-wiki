"use client";

import { ListTree } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  text: string;
  level: number;
}

/** 本文の見出し（h1〜h3）から目次を作る。3 つ以上あるときだけ表示 */
export function Toc({ target }: { target: string }) {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const headings = document.querySelectorAll<HTMLElement>(`${target} :is(h1, h2, h3)`);
    setItems([...headings].filter((h) => h.id).map((h) => ({ id: h.id, text: h.textContent?.trim() ?? "", level: Number(h.tagName[1]) })));
  }, [target, pathname]);

  if (items.length < 3) return null;
  return (
    <nav aria-label="目次" className="mb-4 rounded-lg border border-l-4 border-l-highlight bg-muted/50 p-3 text-sm md:float-right md:mb-4 md:ml-6 md:w-60">
      <strong className="flex items-center gap-1.5">
        <ListTree className="size-4" aria-hidden />
        目次
      </strong>
      <ol className="mt-1.5 grid gap-0.5">
        {items.map((item) => (
          <li key={item.id} className={cn(item.level === 2 && "pl-2.5", item.level === 3 && "pl-5")}>
            <a href={`#${encodeURIComponent(item.id)}`} className="text-link hover:underline">
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
