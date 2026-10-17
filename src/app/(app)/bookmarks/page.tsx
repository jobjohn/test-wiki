import { Bookmark, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookmarkDialog } from "@/components/BookmarkDialog";
import { BookmarkFilters } from "@/components/BookmarkFilters";
import { BookmarkList } from "@/components/BookmarkList";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireUser } from "@/lib/access";
import { isBookmarkSort } from "@/lib/bookmark-utils";
import { countBookmarks, listBookmarks, listBookmarkTags } from "@/lib/bookmarks";
import { listTagNames } from "@/lib/pages";
import { first } from "@/lib/params";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "リンク集" };
const PER_PAGE = 30;

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // リンク集は「ログインなしで閲覧を許可」の設定にかかわらず、ログインした人だけが使える
  const { user } = await requireUser();
  const query = await searchParams;
  const q = first(query.q).trim().slice(0, 200);
  const tag = first(query.tag).trim().slice(0, 50);
  const sortParam = first(query.sort);
  const sort = isBookmarkSort(sortParam) ? sortParam : "new";
  const pageNumber = Math.max(Number.parseInt(first(query.page), 10) || 1, 1);

  const { bookmarks, total } = listBookmarks({ query: q, tag, sort, limit: PER_PAGE, offset: (pageNumber - 1) * PER_PAGE });
  const filtered = !!(q || tag);
  const hasAny = filtered ? countBookmarks() > 0 : total > 0;
  const editable = canEdit(user);
  const tagSuggestions = listTagNames();

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (tag) params.tag = tag;
  if (sort !== "new") params.sort = sort;
  const returnTo = `/bookmarks?${new URLSearchParams({ ...params, ...(pageNumber > 1 ? { page: String(pageNumber) } : {}) })}`;

  const addButton = (
    <BookmarkDialog
      tagSuggestions={tagSuggestions}
      trigger={
        <Button>
          <Plus aria-hidden />
          リンクを追加
        </Button>
      }
    />
  );

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <PageTitle icon={Bookmark}>リンク集</PageTitle>
          <p className="text-sm text-muted-foreground">チームで共有するWebサイト・技術資料を管理します</p>
        </div>
        {editable && hasAny && addButton}
      </header>

      {!hasAny ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark aria-hidden />
            </EmptyMedia>
            <EmptyTitle>リンクがありません</EmptyTitle>
            <EmptyDescription>チームで使うリンクを登録しましょう</EmptyDescription>
          </EmptyHeader>
          {editable && <EmptyContent>{addButton}</EmptyContent>}
        </Empty>
      ) : (
        <BookmarkFilters q={q} tag={tag} sort={sort} tags={listBookmarkTags()}>
          {bookmarks.length ? (
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">{filtered ? `${total} 件が一致しました` : `${total} 件`}</p>
              <Card className="py-2">
                <CardContent className="px-4">
                  <BookmarkList bookmarks={bookmarks} tagSuggestions={tagSuggestions} returnTo={returnTo} editable={editable} />
                </CardContent>
              </Card>
              <Pagination basePath="/bookmarks" params={params} page={pageNumber} hasNext={total > pageNumber * PER_PAGE} />
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden />
                </EmptyMedia>
                <EmptyTitle>一致するリンクがありません</EmptyTitle>
                <EmptyDescription>キーワードやタグを変えて、もう一度お試しください。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" asChild>
                  <Link href="/bookmarks">検索条件を解除</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </BookmarkFilters>
      )}
    </div>
  );
}
