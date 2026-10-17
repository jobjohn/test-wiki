import { FileText, Link as LinkIcon, Paperclip, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { emptyTrashAction, purgeTrashItemAction, restoreTrashAction } from "@/actions/trash";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { TRASH_KIND_LABELS, type TrashKind } from "@/lib/trash-utils";
import { ConfirmAction } from "./ConfirmAction";
import { SubmitButton } from "./SubmitButton";

export interface TrashListItem {
  id: number;
  kind: TrashKind;
  title: string;
  deletedByName: string | null;
  /** ISO 形式 */
  deletedAt: string;
  /** 完全に削除されるまでの残り日数（画面側で計算して渡す） */
  daysLeft: number;
}

const KIND_ICONS: Record<TrashKind, LucideIcon> = { page: FileText, bookmark: LinkIcon, upload: Paperclip };

/** ゴミ箱の一覧。復元は編集できる人、完全削除は管理者（isAdmin）だけに出す */
export function TrashList({ items, isAdmin }: { items: TrashListItem[]; isAdmin: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>種類</TableHead>
          <TableHead>名前</TableHead>
          <TableHead>削除した人</TableHead>
          <TableHead>削除日時</TableHead>
          <TableHead>残り日数</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind];
          return (
            <TableRow key={item.id}>
              <TableCell>
                <Badge variant="secondary">
                  <Icon aria-hidden />
                  {TRASH_KIND_LABELS[item.kind]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs break-all whitespace-normal">{item.title}</TableCell>
              <TableCell>{item.deletedByName ?? "（削除されたユーザー）"}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateTime(item.deletedAt)}</TableCell>
              <TableCell className="whitespace-nowrap">あと {item.daysLeft} 日</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <form action={restoreTrashAction.bind(null, item.id)}>
                    <SubmitButton variant="outline" size="sm" pendingText="復元中..." aria-label={`${item.title} を復元`}>
                      <RotateCcw aria-hidden />
                      復元
                    </SubmitButton>
                  </form>
                  {isAdmin && (
                    <ConfirmAction
                      action={purgeTrashItemAction.bind(null, item.id)}
                      title="完全に削除しますか？"
                      description={`「${item.title}」を完全に削除します。この操作は取り消せず、元に戻せなくなります。`}
                      confirmLabel="完全に削除する"
                      destructive
                      trigger={
                        <Button variant="destructive" size="icon-sm" aria-label={`${item.title} を完全に削除`}>
                          <Trash2 aria-hidden />
                        </Button>
                      }
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** 「ゴミ箱を空にする」ボタン（確認ダイアログつき）。管理者だけに出す */
export function EmptyTrashButton({ count }: { count: number }) {
  return (
    <ConfirmAction
      action={emptyTrashAction}
      title="ゴミ箱を空にしますか？"
      description={`ゴミ箱の ${count} 件をすべて完全に削除します。この操作は取り消せず、元に戻せなくなります。`}
      confirmLabel="空にする"
      destructive
      trigger={
        <Button variant="destructive">
          <Trash2 aria-hidden />
          ゴミ箱を空にする
        </Button>
      }
    />
  );
}
