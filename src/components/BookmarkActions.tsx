"use client";

import { Ellipsis, Info, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deleteBookmarkAction } from "@/actions/bookmarks";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookmarkDialog, type BookmarkFormValues } from "./BookmarkDialog";
import { ConfirmAction } from "./ConfirmAction";

/** リンクの「⋯」メニュー（詳細・編集・ゴミ箱へ移動） */
export function BookmarkActions({
  bookmark,
  tagSuggestions,
  returnTo,
  showDetail = true,
}: {
  bookmark: BookmarkFormValues & { id: number };
  tagSuggestions: string[];
  /** ゴミ箱へ移した後に戻る画面 */
  returnTo: string;
  showDetail?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`「${bookmark.title}」の操作`}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showDetail && (
            <DropdownMenuItem asChild>
              <Link href={`/bookmarks/${bookmark.id}`}>
                <Info aria-hidden />
                詳細
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            編集
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden />
            ゴミ箱に移動
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookmarkDialog initial={bookmark} tagSuggestions={tagSuggestions} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmAction
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        action={deleteBookmarkAction.bind(null, bookmark.id, returnTo)}
        title="リンクをゴミ箱に移動"
        description={`「${bookmark.title}」をゴミ箱に移動します。共有リンク集から表示されなくなりますが、30 日以内ならゴミ箱から元に戻せます。`}
        confirmLabel="ゴミ箱に移動する"
        destructive
      />
    </>
  );
}
