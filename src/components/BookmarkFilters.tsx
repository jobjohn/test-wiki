"use client";

import { Search, Tag as TagIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { BOOKMARK_SORTS, type BookmarkSort } from "@/lib/bookmark-utils";

/**
 * リンク集の検索欄・並び順・タグの絞り込み。条件は URL のクエリ（q / tag / sort）に入れ、一覧はサーバーで取得する。
 * 切り替え中はスピナーを出し、children（一覧）を薄く表示する。
 */
export function BookmarkFilters({
  q,
  tag,
  sort,
  tags,
  children,
}: {
  q: string;
  tag: string;
  sort: BookmarkSort;
  tags: { id: number; name: string }[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  // タグのリンクなど、検索欄の外で条件が変わったときは検索欄も合わせる（描画中に前回の値と比べて更新する）
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setQuery(q);
  }

  const navigate = (next: { q?: string; tag?: string; sort?: BookmarkSort }) => {
    const merged = { q: query, tag, sort, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.tag) params.set("tag", merged.tag);
    if (merged.sort !== "new") params.set("sort", merged.sort);
    startTransition(() => router.push(params.size ? `${pathname}?${params}` : pathname));
  };

  return (
    <div className="grid gap-4">
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({});
        }}
      >
        <InputGroup className="sm:flex-1">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="リンクを検索..."
            aria-label="リンクを検索"
            maxLength={200}
          />
          {pending && (
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          )}
        </InputGroup>
        <NativeSelect value={sort} onChange={(e) => navigate({ sort: e.target.value as BookmarkSort })} aria-label="並び順" className="sm:w-36">
          {Object.entries(BOOKMARK_SORTS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </form>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="タグで絞り込む">
          <li>
            <Badge variant={tag ? "outline" : "default"} asChild>
              <button type="button" aria-pressed={!tag} onClick={() => navigate({ tag: "" })}>
                すべて
              </button>
            </Badge>
          </li>
          {tags.map((t) => {
            const active = t.name.toLowerCase() === tag.toLowerCase();
            return (
              <li key={t.id}>
                <Badge variant={active ? "default" : "outline"} asChild>
                  <button type="button" aria-pressed={active} onClick={() => navigate({ tag: active ? "" : t.name })}>
                    <TagIcon aria-hidden />
                    {t.name}
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {children}
      </div>
    </div>
  );
}
