"use client";

import { ListTree } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    <nav className="toc" aria-label="目次">
      <strong>
        <ListTree size={16} aria-hidden /> 目次
      </strong>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`toc-h${item.level}`}>
            <a href={`#${encodeURIComponent(item.id)}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
