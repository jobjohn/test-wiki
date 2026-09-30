"use client";

import { BookOpen, LogIn, Menu, Plus, Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import type { Flash } from "@/lib/flash";
import { FlashBanner } from "./FlashBanner";
import { Sidebar, type TreeData } from "./Sidebar";
import { UserMenu } from "./UserMenu";

export interface ShellUser {
  name: string;
  username: string;
  roleName: string;
  isAdmin: boolean;
  canEdit: boolean;
}

function SearchBox() {
  const params = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable]");
      if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Form action="/search" className="topbar-search" role="search">
      <Search size={16} className="search-icon" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        name="q"
        key={pathname === "/search" ? params.get("q") : "q"}
        defaultValue={pathname === "/search" ? (params.get("q") ?? "") : ""}
        placeholder="検索（/ キー）"
        aria-label="Wiki を検索"
      />
      <input type="hidden" name="go" value="1" />
    </Form>
  );
}

export function ShellFrame({
  wikiName,
  user,
  tree,
  flash,
  children,
}: {
  wikiName: string;
  user: ShellUser | null;
  tree: TreeData | null;
  flash: Flash | null;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`shell${menuOpen ? " menu-open" : ""}`}>
      <header className="topbar">
        <button
          type="button"
          className="icon-button menu-toggle"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <BookOpen size={18} aria-hidden />
          </span>
          <span className="brand-name">{wikiName}</span>
        </Link>
        <Suspense fallback={<div className="topbar-search" />}>
          <SearchBox />
        </Suspense>
        {user?.canEdit && (
          <Link href="/pages/new" className="button button-accent topbar-new">
            <Plus size={18} aria-hidden />
            <span>新規ページ</span>
          </Link>
        )}
        {user ? (
          <UserMenu name={user.name} username={user.username} roleName={user.roleName} isAdmin={user.isAdmin} />
        ) : (
          <Link href="/login" className="button button-ghost">
            <LogIn size={18} aria-hidden />
            <span>ログイン</span>
          </Link>
        )}
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Sidebar tree={tree} canEdit={!!user?.canEdit} />
        </aside>
        <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />
        <main className="content">
          <FlashBanner flash={flash} />
          {children}
        </main>
      </div>
    </div>
  );
}
