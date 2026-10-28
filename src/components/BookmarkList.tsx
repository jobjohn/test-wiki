import { ExternalLink, Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { displayDomain, plainExcerpt } from "@/lib/bookmark-utils";
import { BookmarkActions } from "./BookmarkActions";
import { Favicon } from "./Favicon";

export interface BookmarkListItem {
  id: number;
  title: string;
  url: string;
  descriptionMd: string;
  faviconUrl: string | null;
  createdByName: string | null;
  tags: { id: number; name: string }[];
}

/** リンク集の一覧（コンパクトなリスト）。タイトル・外部リンクのアイコンは別タブで開く */
export function BookmarkList({
  bookmarks,
  tagSuggestions,
  returnTo,
  editable,
}: {
  bookmarks: BookmarkListItem[];
  tagSuggestions: string[];
  returnTo: string;
  editable: boolean;
}) {
  return (
    <ItemGroup>
      {bookmarks.map((bookmark, i) => {
        const excerpt = plainExcerpt(bookmark.descriptionMd);
        return (
          <Fragment key={bookmark.id}>
            {i > 0 && <ItemSeparator />}
            <Item role="listitem" size="sm" className="items-start px-0">
              <ItemMedia variant="icon">
                <Favicon src={bookmark.faviconUrl} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="flex-wrap">
                  <Button variant="link" asChild className="h-auto p-0 whitespace-normal">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                      {bookmark.title}
                    </a>
                  </Button>
                  {bookmark.tags.length > 0 && (
                    <span className="inline-flex flex-wrap gap-1.5">
                      {bookmark.tags.map((tag) => (
                        <Badge key={tag.id} variant="highlight" asChild>
                          <Link href={`/bookmarks?tag=${encodeURIComponent(tag.name)}`}>
                            <TagIcon aria-hidden />
                            {tag.name}
                          </Link>
                        </Badge>
                      ))}
                    </span>
                  )}
                </ItemTitle>
                <ItemDescription className="break-all">{displayDomain(bookmark.url)}</ItemDescription>
                {excerpt && <ItemDescription>{excerpt}</ItemDescription>}
                <ItemDescription>登録者：{bookmark.createdByName ?? "（削除されたユーザー）"}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer" aria-label={`「${bookmark.title}」を新しいタブで開く`}>
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
                {editable && (
                  <BookmarkActions
                    bookmark={{ ...bookmark, tags: bookmark.tags.map((t) => t.name) }}
                    tagSuggestions={tagSuggestions}
                    returnTo={returnTo}
                  />
                )}
              </ItemActions>
            </Item>
          </Fragment>
        );
      })}
    </ItemGroup>
  );
}
