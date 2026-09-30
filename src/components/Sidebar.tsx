"use client";

import { ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, History, House, Paperclip, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TreeData {
  folders: { id: number; name: string; parentId: number | null }[];
  pages: { id: number; title: string; folderId: number | null }[];
}

const NAV = [
  { href: "/", label: "ホーム", icon: House, match: (p: string) => p === "/" },
  { href: "/changes", label: "最近の更新", icon: History, match: (p: string) => p.startsWith("/changes") },
  { href: "/tags", label: "タグ", icon: Tags, match: (p: string) => p.startsWith("/tags") },
  { href: "/uploads", label: "ファイル", icon: Paperclip, match: (p: string) => p.startsWith("/uploads") },
];

const rowClass = (active: boolean) =>
  cn(
    "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    active && "bg-sidebar-accent font-semibold text-link",
  );

export function Sidebar({ tree, canEdit }: { tree: TreeData | null; canEdit: boolean }) {
  const pathname = usePathname();

  const { folderChildren, pagesByFolder, parentOf } = useMemo(() => {
    const folderChildren = new Map<number | null, TreeData["folders"]>();
    const pagesByFolder = new Map<number | null, TreeData["pages"]>();
    const parentOf = new Map<number, number | null>();
    for (const f of tree?.folders ?? []) {
      folderChildren.set(f.parentId, [...(folderChildren.get(f.parentId) ?? []), f]);
      parentOf.set(f.id, f.parentId);
    }
    for (const p of tree?.pages ?? []) pagesByFolder.set(p.folderId, [...(pagesByFolder.get(p.folderId) ?? []), p]);
    return { folderChildren, pagesByFolder, parentOf };
  }, [tree]);

  // 現在開いているページ / フォルダ（新規作成画面の /pages/new などは含めない）
  const currentPageId = /^\/pages\/(\d+)(\/|$)/.exec(pathname)?.[1];
  const currentFolderId = /^\/folders\/(\d+)(\/|$)/.exec(pathname)?.[1];
  const current = useMemo(() => {
    const pageId = currentPageId ? Number(currentPageId) : null;
    const folderId = currentFolderId ? Number(currentFolderId) : null;
    const startFolder = folderId ?? tree?.pages.find((p) => p.id === pageId)?.folderId ?? null;
    const ancestors: number[] = [];
    for (let id = startFolder, guard = 0; id !== null && guard < 100; id = parentOf.get(id) ?? null, guard++) ancestors.push(id);
    return { pageId, folderId, ancestors };
  }, [currentPageId, currentFolderId, tree, parentOf]);

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(current.ancestors));
  useEffect(() => {
    // 別のページへ移動したら、そのページを含むフォルダを開く（手動で開いたものはそのまま）
    setExpanded((prev) => (current.ancestors.every((id) => prev.has(id)) ? prev : new Set([...prev, ...current.ancestors])));
  }, [current]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const renderLevel = (parentId: number | null, nested = false) => (
    <ul className={cn("grid gap-0.5", nested && "ml-[1.15rem] border-l pl-1.5")}>
      {(folderChildren.get(parentId) ?? []).map((folder) => {
        const open = expanded.has(folder.id);
        return (
          <li key={`f${folder.id}`}>
            <div className="flex items-center">
              <button
                type="button"
                className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-expanded={open}
                aria-label={`${folder.name}を${open ? "閉じる" : "開く"}`}
                onClick={() => toggle(folder.id)}
              >
                <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} aria-hidden />
              </button>
              <Link href={`/folders/${folder.id}`} className={rowClass(current.folderId === folder.id)} aria-current={current.folderId === folder.id ? "page" : undefined}>
                {open ? <FolderOpen className="text-highlight-text" aria-hidden /> : <Folder className="text-highlight-text" aria-hidden />}
                <span>{folder.name}</span>
              </Link>
            </div>
            {open && renderLevel(folder.id, true)}
          </li>
        );
      })}
      {(pagesByFolder.get(parentId) ?? []).map((page) => (
        <li key={`p${page.id}`} className="flex pl-6">
          <Link href={`/pages/${page.id}`} className={rowClass(current.pageId === page.id)} aria-current={current.pageId === page.id ? "page" : undefined}>
            <FileText className="text-muted-foreground" aria-hidden />
            <span>{page.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  const hasContent = (folderChildren.get(null)?.length ?? 0) + (pagesByFolder.get(null)?.length ?? 0) > 0;

  return (
    <nav className="grid gap-4" aria-label="サイドバー">
      <ul className="grid gap-0.5">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <li key={href} className="flex">
            <Link href={href} className={rowClass(match(pathname))} aria-current={match(pathname) ? "page" : undefined}>
              <Icon className="text-muted-foreground" aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-1">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground">ページ</h2>
          {canEdit && (
            <span className="flex gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" asChild>
                    <Link href="/folders/new" aria-label="新しいフォルダ">
                      <FolderPlus aria-hidden />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>新しいフォルダ</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" asChild>
                    <Link href="/pages/new" aria-label="新しいページ">
                      <FilePlus aria-hidden />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>新しいページ</TooltipContent>
              </Tooltip>
            </span>
          )}
        </div>
        {hasContent ? renderLevel(null) : <p className="px-2 text-sm text-muted-foreground">まだページがありません。</p>}
      </div>
    </nav>
  );
}
