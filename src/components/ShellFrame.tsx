"use client";

import { BookOpen, LogIn, Plus, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type CSSProperties, type ReactNode, Suspense, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Flash } from "@/lib/flash";
import { FlashBanner } from "./FlashBanner";
import { Sidebar, type TreeData } from "./Sidebar";
import { UserMenu } from "./UserMenu";

export interface ShellUser {
  name: string;
  email: string;
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
    <Form action="/search" role="search" className="ml-auto w-full max-w-md flex-1">
      <InputGroup>
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          name="q"
          key={pathname === "/search" ? params.get("q") : "q"}
          defaultValue={pathname === "/search" ? (params.get("q") ?? "") : ""}
          placeholder="検索"
          aria-label="Wiki を検索"
        />
        <InputGroupAddon align="inline-end" className="max-sm:hidden">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>
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
  return (
    <TooltipProvider>
      <SidebarProvider className="flex-col" style={{ "--header-height": "3.5rem" } as CSSProperties}>
        {/* キーボード操作で、ヘッダーとサイドバーを飛ばして本文へ移れるようにする（フォーカスしたときだけ見える） */}
        <a
          href="#main-content"
          className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          本文へスキップ
        </a>
        <header className="sticky top-0 z-30 flex h-(--header-height) items-center gap-2 border-b bg-background px-3 md:gap-3 md:px-4">
          <SidebarTrigger />

          <Button variant="ghost" asChild className="min-w-0">
            <Link href="/">
              <BookOpen aria-hidden />
              <span className="hidden truncate min-[480px]:inline">{wikiName}</span>
            </Link>
          </Button>

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
            <UserMenu name={user.name} email={user.email} roleName={user.roleName} isAdmin={user.isAdmin} />
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/login">
                <LogIn aria-hidden />
                ログイン
              </Link>
            </Button>
          )}
        </header>

        <div className="flex flex-1">
          <Sidebar tree={tree} canEdit={!!user?.canEdit} className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" />
          <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 px-4 pt-6 pb-16 outline-none md:px-10 md:pt-8">
            <FlashBanner flash={flash} />
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
