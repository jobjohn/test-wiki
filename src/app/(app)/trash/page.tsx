import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { EmptyTrashButton, TrashList } from "@/components/TrashList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireAccess } from "@/lib/access";
import { first } from "@/lib/params";
import { countTrash, listTrash, safePurge, TRASH_RETENTION_DAYS } from "@/lib/trash";
import { isTrashKind, TRASH_KIND_LABELS, trashDaysLeft, TRASH_KINDS } from "@/lib/trash-utils";
import { isAdmin } from "@/lib/users";

export const metadata: Metadata = { title: "ゴミ箱" };
const PER_PAGE = 30;

export default async function TrashPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // 「ログインなしで閲覧を許可」でも、ゴミ箱は編集できるユーザーにだけ見せる
  const { user } = await requireAccess("edit");
  const query = await searchParams;
  const kindParam = first(query.kind);
  const kind = isTrashKind(kindParam) ? kindParam : undefined;
  const pageNumber = Math.max(Number.parseInt(first(query.page), 10) || 1, 1);

  safePurge();
  const { items, total } = listTrash({ kind, limit: PER_PAGE, offset: (pageNumber - 1) * PER_PAGE });
  const overall = countTrash();
  const admin = isAdmin(user);
  const now = new Date();

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <PageTitle icon={Trash2}>ゴミ箱</PageTitle>
          <p className="text-sm text-muted-foreground">削除したページ・リンク・ファイルは {TRASH_RETENTION_DAYS} 日間ここに残り、元に戻せます</p>
        </div>
        {admin && overall > 0 && <EmptyTrashButton count={overall} />}
      </header>

      <nav aria-label="種類で絞り込む" className="flex flex-wrap gap-2">
        <Button variant={kind ? "outline" : "default"} size="sm" asChild>
          <Link href="/trash" aria-current={kind ? undefined : "true"}>
            すべて
          </Link>
        </Button>
        {TRASH_KINDS.map((k) => (
          <Button key={k} variant={kind === k ? "default" : "outline"} size="sm" asChild>
            <Link href={`/trash?kind=${k}`} aria-current={kind === k ? "true" : undefined}>
              {TRASH_KIND_LABELS[k]}
            </Link>
          </Button>
        ))}
      </nav>

      {items.length ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{total} 件</p>
          <Card className="py-2">
            <CardContent className="px-2">
              <TrashList items={items.map((item) => ({ ...item, daysLeft: trashDaysLeft(item.deletedAt, now) }))} isAdmin={admin} />
            </CardContent>
          </Card>
          <Pagination basePath="/trash" params={kind ? { kind } : {}} page={pageNumber} hasNext={total > pageNumber * PER_PAGE} />
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Trash2 aria-hidden />
            </EmptyMedia>
            <EmptyTitle>ゴミ箱は空です</EmptyTitle>
            <EmptyDescription>削除したページ・リンク・ファイルがここに表示されます。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
