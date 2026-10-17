"use client";

import { Ellipsis, Info, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deleteBookmarkAction } from "@/actions/bookmarks";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookmarkDialog, type BookmarkFormValues } from "./BookmarkDialog";
import { ConfirmAction } from "./ConfirmAction";

/** リンクの「⋯」メニュー（詳細・編集・削除） */
export function BookmarkActions({
  bookmark,
  tagSuggestions,
  returnTo,
  showDetail = true,
}: {
  bookmark: BookmarkFormValues & { id: number };
  tagSuggestions: string[];
  /** 削除した後に戻る画面 */
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
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookmarkDialog initial={bookmark} tagSuggestions={tagSuggestions} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmAction
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        action={deleteBookmarkAction.bind(null, bookmark.id, returnTo)}
        title="リンクを削除"
        description={`「${bookmark.title}」を削除しますか？この操作により共有リンク集から表示されなくなります。`}
        confirmLabel="削除する"
        destructive
      />
    </>
  );
}
