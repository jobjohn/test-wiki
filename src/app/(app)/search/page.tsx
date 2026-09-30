import { FilePlus, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageList } from "@/components/PageList";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAccess } from "@/lib/access";
import { first } from "@/lib/params";
import { findPageByTitle, searchPages } from "@/lib/pages";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "検索" };
const PER_PAGE = 30;

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireAccess();
  const query = await searchParams;
  const q = first(query.q).trim().slice(0, 200);
  const pageNumber = Math.max(Number.parseInt(first(query.page), 10) || 1, 1);

  // 上部の検索ボックスから送信されたとき、タイトルが完全一致するページがあればそのまま開く
  const exact = q ? findPageByTitle(q) : undefined;
  if (first(query.go) && exact) redirect(`/pages/${exact.id}`);

  const result = q ? searchPages(q, PER_PAGE, (pageNumber - 1) * PER_PAGE) : { pages: [], total: 0 };

  return (
    <div className="grid gap-4">
      <PageTitle icon={Search}>検索</PageTitle>
      <Form action="/search" className="flex gap-2">
        <Input type="search" name="q" defaultValue={q} placeholder="キーワード（空白区切りで AND 検索）" autoFocus={!q} aria-label="キーワード" />
        <Button type="submit">
          <Search aria-hidden />
          検索
        </Button>
      </Form>

      {q && (
        <>
          <p className="text-sm text-muted-foreground">
            「{q}」の検索結果: {result.total} 件
          </p>
          {canEdit(user) && !exact && (
            <Link href={`/pages/new?title=${encodeURIComponent(q)}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-link hover:underline">
              <FilePlus className="size-4" aria-hidden /> ページ「{q}」を新規作成
            </Link>
          )}
          {result.pages.length > 0 && (
            <Card>
              <CardContent>
                <PageList pages={result.pages} query={q} />
              </CardContent>
            </Card>
          )}
          <Pagination basePath="/search" params={{ q }} page={pageNumber} hasNext={result.total > pageNumber * PER_PAGE} />
        </>
      )}
    </div>
  );
}
