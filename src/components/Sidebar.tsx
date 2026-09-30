"use client";

import { ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, History, House, Paperclip, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

  const renderLevel = (parentId: number | null) => (
    <ul className="tree">
      {(folderChildren.get(parentId) ?? []).map((folder) => {
        const open = expanded.has(folder.id);
        return (
          <li key={`f${folder.id}`}>
            <div className="tree-row">
              <button
                type="button"
                className="tree-toggle"
                aria-expanded={open}
                aria-label={`${folder.name}を${open ? "閉じる" : "開く"}`}
                onClick={() => toggle(folder.id)}
              >
                <ChevronRight size={14} className={`tree-chevron${open ? " open" : ""}`} aria-hidden />
              </button>
              <Link href={`/folders/${folder.id}`} className={`tree-link${current.folderId === folder.id ? " current" : ""}`}>
                {open ? <FolderOpen size={16} className="tree-folder-icon" aria-hidden /> : <Folder size={16} className="tree-folder-icon" aria-hidden />}
                <span>{folder.name}</span>
              </Link>
            </div>
            {open && renderLevel(folder.id)}
          </li>
        );
      })}
      {(pagesByFolder.get(parentId) ?? []).map((page) => (
        <li key={`p${page.id}`}>
          <Link href={`/pages/${page.id}`} className={`tree-link tree-leaf${current.pageId === page.id ? " current" : ""}`}>
            <FileText size={16} className="tree-icon" aria-hidden />
            <span>{page.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  const hasContent = (folderChildren.get(null)?.length ?? 0) + (pagesByFolder.get(null)?.length ?? 0) > 0;

  return (
    <nav className="sidebar-nav" aria-label="サイドバー">
      <ul className="nav-links">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <li key={href}>
            <Link href={href} className={match(pathname) ? "active" : undefined}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-section">
        <h2 className="sidebar-heading">ページ</h2>
        {canEdit && (
          <span className="sidebar-actions">
            <Link href="/folders/new" className="icon-button icon-button-small" title="新しいフォルダ" aria-label="新しいフォルダ">
              <FolderPlus size={16} aria-hidden />
            </Link>
            <Link href="/pages/new" className="icon-button icon-button-small" title="新しいページ" aria-label="新しいページ">
              <FilePlus size={16} aria-hidden />
            </Link>
          </span>
        )}
      </div>
      {hasContent ? renderLevel(null) : <p className="muted small sidebar-empty">まだページがありません。</p>}
    </nav>
  );
}
