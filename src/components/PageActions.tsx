"use client";

import { Download, Ellipsis, History, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deletePageAction } from "@/actions/pages";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmAction } from "./ConfirmAction";

/** 記事の操作（編集・履歴・ダウンロード・ゴミ箱）を「…」にまとめる */
export function PageActions({ pageId, title, editable }: { pageId: number; title: string; editable: boolean }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {editable && (
        <Link href={`/pages/${pageId}/edit`} accessKey="e" tabIndex={-1} className="sr-only">
          編集
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="ページの操作" className="max-md:size-11">
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {editable && (
            <DropdownMenuItem asChild className="max-md:min-h-11">
              <Link href={`/pages/${pageId}/edit`}>
                <Pencil aria-hidden />
                編集
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className="max-md:min-h-11">
            <Link href={`/pages/${pageId}/revisions`}>
              <History aria-hidden />
              履歴
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="max-md:min-h-11">
            <a href={`/pages/${pageId}/markdown?download=1`} download>
              <Download aria-hidden />
              Markdown
            </a>
          </DropdownMenuItem>
          {editable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="max-md:min-h-11" onSelect={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden />
                ゴミ箱に移動
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {editable && (
        <ConfirmAction
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          action={deletePageAction.bind(null, pageId)}
          title="ページをゴミ箱に移動しますか？"
          description={`ページ「${title}」をゴミ箱に移動します。変更履歴も一緒に移り、30 日以内ならゴミ箱から元に戻せます。`}
          confirmLabel="ゴミ箱に移動する"
          destructive
        />
      )}
    </>
  );
}
