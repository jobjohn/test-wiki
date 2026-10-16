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
    <Form action="/search" role="search" className="ml-auto w-full max-w-md flex-1">
      <InputGroup className="h-9 border-header-foreground/20 bg-header-foreground/10 text-header-foreground">
        <InputGroupAddon>
          <Search className="text-header-foreground/70" aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          name="q"
          key={pathname === "/search" ? params.get("q") : "q"}
          defaultValue={pathname === "/search" ? (params.get("q") ?? "") : ""}
          placeholder="検索"
          aria-label="Wiki を検索"
          className="text-header-foreground placeholder:text-header-foreground/60"
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
        <header className="sticky top-0 z-30 flex h-(--header-height) items-center gap-2 border-b bg-header px-3 text-header-foreground md:gap-3 md:px-4">
          <SidebarTrigger className="size-9 hover:bg-header-foreground/10 hover:text-header-foreground" />

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

        <div className="flex flex-1">
          <Sidebar tree={tree} canEdit={!!user?.canEdit} className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" />
          <SidebarInset className="min-w-0 px-4 pt-6 pb-16 md:px-10 md:pt-8">
            <FlashBanner flash={flash} />
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
