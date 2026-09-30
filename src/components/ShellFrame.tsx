"use client";

import { BookOpen, LogIn, Menu, Plus, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
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

  // 「/」キーで検索ボックスへ移動
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
    <Form action="/search" role="search" className="relative ml-auto w-full max-w-md flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-70" aria-hidden />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        key={pathname === "/search" ? params.get("q") : "q"}
        defaultValue={pathname === "/search" ? (params.get("q") ?? "") : ""}
        placeholder="検索（/ キー）"
        aria-label="Wiki を検索"
        className="h-9 rounded-full border-header-foreground/20 bg-header-foreground/10 pl-9 text-header-foreground placeholder:text-header-foreground/60"
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

  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-header px-3 text-header-foreground md:gap-3 md:px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-header-foreground/10 hover:text-header-foreground md:hidden" aria-label="メニュー">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 sm:max-w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>メニュー</SheetTitle>
                <SheetDescription>ページとフォルダの一覧</SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-full">
                <div className="p-3 pt-12">
                  <Sidebar tree={tree} canEdit={!!user?.canEdit} />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-bold">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_-3px_0_var(--highlight)]">
              <BookOpen className="size-[18px]" aria-hidden />
            </span>
            <span className="hidden truncate min-[480px]:inline">{wikiName}</span>
          </Link>

          <Suspense fallback={<div className="ml-auto flex-1" />}>
            <SearchBox />
          </Suspense>

          {user?.canEdit && (
            <Button variant="highlight" asChild aria-label="新規ページ">
              <Link href="/pages/new">
                <Plus aria-hidden />
                <span className="hidden sm:inline">新規ページ</span>
              </Link>
            </Button>
          )}
          {user ? (
            <UserMenu name={user.name} username={user.username} roleName={user.roleName} isAdmin={user.isAdmin} />
          ) : (
            <Button variant="ghost" className="hover:bg-header-foreground/10 hover:text-header-foreground" asChild>
              <Link href="/login">
                <LogIn aria-hidden />
                ログイン
              </Link>
            </Button>
          )}
        </header>

        <div className="flex">
          <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 border-r bg-sidebar md:block">
            <ScrollArea className="h-full">
              <div className="p-3 pb-10">
                <Sidebar tree={tree} canEdit={!!user?.canEdit} />
              </div>
            </ScrollArea>
          </aside>
          <main className="min-w-0 flex-1 px-4 pt-6 pb-16 md:px-10 md:pt-8">
            <FlashBanner flash={flash} />
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
