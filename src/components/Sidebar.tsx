"use client";

import { Bookmark, ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, History, House, Paperclip, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface TreeData {
  folders: { id: number; name: string; parentId: number | null }[];
  pages: { id: number; title: string; folderId: number | null }[];
}

const NAV = [
  { href: "/", label: "ホーム", icon: House, match: (p: string) => p === "/" },
  { href: "/changes", label: "最近の更新", icon: History, match: (p: string) => p.startsWith("/changes") },
  { href: "/tags", label: "タグ", icon: Tags, match: (p: string) => p.startsWith("/tags") },
  { href: "/uploads", label: "ファイル", icon: Paperclip, match: (p: string) => p.startsWith("/uploads") },
  { href: "/bookmarks", label: "リンク集", icon: Bookmark, match: (p: string) => p.startsWith("/bookmarks") },
  // ゴミ箱は編集できるユーザーだけに見せる
  { href: "/trash", label: "ゴミ箱", icon: Trash2, match: (p: string) => p.startsWith("/trash"), editOnly: true },
];

/** サイドバー（ナビゲーションと、フォルダ・ページのツリー）。スマートフォンではシートとして開く */
export function Sidebar({ tree, canEdit, ...props }: { tree: TreeData | null; canEdit: boolean } & ComponentProps<typeof SidebarRoot>) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  // 別の画面へ移動したら、スマートフォンのメニューを閉じる
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile]);

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

  const setOpen = (id: number, open: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const renderItems = (parentId: number | null) => (
    <>
      {(folderChildren.get(parentId) ?? []).map((folder) => {
        const open = expanded.has(folder.id);
        const active = current.folderId === folder.id;
        return (
          <Collapsible key={`f${folder.id}`} asChild open={open} onOpenChange={(value) => setOpen(folder.id, value)}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={active}>
                <Link href={`/folders/${folder.id}`} aria-current={active ? "page" : undefined}>
                  {open ? <FolderOpen aria-hidden /> : <Folder aria-hidden />}
                  <span>{folder.name}</span>
                </Link>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="data-[state=open]:rotate-90" aria-label={`${folder.name}を${open ? "閉じる" : "開く"}`}>
                  <ChevronRight aria-hidden />
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="mr-0 pr-0">{renderItems(folder.id)}</SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      })}
      {(pagesByFolder.get(parentId) ?? []).map((page) => {
        const active = current.pageId === page.id;
        return (
          <SidebarMenuItem key={`p${page.id}`}>
            <SidebarMenuButton asChild isActive={active}>
              <Link href={`/pages/${page.id}`} aria-current={active ? "page" : undefined}>
                <FileText aria-hidden />
                <span>{page.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );

  const hasContent = (folderChildren.get(null)?.length ?? 0) + (pagesByFolder.get(null)?.length ?? 0) > 0;

  return (
    <SidebarRoot aria-label="サイドバー" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter((item) => canEdit || !("editOnly" in item)).map(({ href, label, icon: Icon, match }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={match(pathname)}>
                    <Link href={href} aria-current={match(pathname) ? "page" : undefined}>
                      <Icon aria-hidden />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>ページ</SidebarGroupLabel>
          {canEdit && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarGroupAction asChild className="right-10">
                    <Link href="/folders/new" aria-label="新しいフォルダ">
                      <FolderPlus aria-hidden />
                    </Link>
                  </SidebarGroupAction>
                </TooltipTrigger>
                <TooltipContent>新しいフォルダ</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarGroupAction asChild>
                    <Link href="/pages/new" aria-label="新しいページ">
                      <FilePlus aria-hidden />
                    </Link>
                  </SidebarGroupAction>
                </TooltipTrigger>
                <TooltipContent>新しいページ</TooltipContent>
              </Tooltip>
            </>
          )}
          <SidebarGroupContent>
            {hasContent ? (
              <SidebarMenu>{renderItems(null)}</SidebarMenu>
            ) : (
              <p className="px-2 text-sm text-muted-foreground">まだページがありません。</p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarRoot>
  );
}
