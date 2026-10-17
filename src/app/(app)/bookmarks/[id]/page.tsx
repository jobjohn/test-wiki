import { CalendarPlus, Clock, ExternalLink, Tag as TagIcon, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkActions } from "@/components/BookmarkActions";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { Favicon } from "@/components/Favicon";
import { Markdown } from "@/components/Markdown";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/access";
import { displayDomain } from "@/lib/bookmark-utils";
import { getBookmark } from "@/lib/bookmarks";
import { formatDateTime } from "@/lib/format";
import { listTagNames } from "@/lib/pages";
import { parseId } from "@/lib/params";
import { getCurrentUser } from "@/lib/session";
import { canEdit } from "@/lib/users";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bookmark = /^\d+$/.test(id) && (await getCurrentUser()) ? getBookmark(Number(id)) : undefined;
  return { title: bookmark?.title ?? "リンク集" };
}

export default async function BookmarkView({ params }: Props) {
  const { user } = await requireUser();
  const bookmark = getBookmark(parseId((await params).id));
  if (!bookmark) notFound();
  const deletedUser = "（削除されたユーザー）";

  return (
    <article className="grid gap-5">
      <header className="grid gap-3">
        <div>
          <SimpleBreadcrumb items={[{ href: "/bookmarks", label: "リンク集" }]} />
          <PageTitle>{bookmark.title}</PageTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Favicon src={bookmark.faviconUrl} />
          <Button variant="link" asChild className="h-auto p-0 break-all whitespace-normal">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              {bookmark.url}
            </a>
          </Button>
        </div>
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <Badge key={tag.id} variant="highlight" asChild>
                <Link href={`/bookmarks?tag=${encodeURIComponent(tag.name)}`}>
                  <TagIcon aria-hidden />
                  {tag.name}
                </Link>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              {displayDomain(bookmark.url)} を開く
            </a>
          </Button>
          {canEdit(user) && (
            <BookmarkActions
              bookmark={{ ...bookmark, tags: bookmark.tags.map((t) => t.name) }}
              tagSuggestions={listTagNames()}
              returnTo={`/bookmarks/${bookmark.id}`}
              showDetail={false}
            />
          )}
        </div>
      </header>

      <Card>
        <CardContent>
          {bookmark.descriptionMd ? <Markdown source={bookmark.descriptionMd} /> : <p className="text-muted-foreground">説明はありません。</p>}
        </CardContent>
      </Card>

      <dl className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-1">
          <User className="size-3.5" aria-hidden />
          <dt>登録者：</dt>
          <dd>{bookmark.createdByName ?? deletedUser}</dd>
        </div>
        <div className="flex items-center gap-1">
          <CalendarPlus className="size-3.5" aria-hidden />
          <dt>登録日時：</dt>
          <dd>{formatDateTime(bookmark.createdAt)}</dd>
        </div>
        <div className="flex items-center gap-1">
          <User className="size-3.5" aria-hidden />
          <dt>最終更新者：</dt>
          <dd>{bookmark.updatedByName ?? deletedUser}</dd>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          <dt>更新日時：</dt>
          <dd>{formatDateTime(bookmark.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
