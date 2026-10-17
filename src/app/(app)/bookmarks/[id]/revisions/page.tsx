import { History, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { restoreBookmarkRevisionAction } from "@/actions/bookmarks";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/access";
import { getBookmark, listBookmarkRevisions } from "@/lib/bookmarks";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/params";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "リンクの変更履歴" };

export default async function BookmarkRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  const bookmark = getBookmark(parseId((await params).id));
  if (!bookmark) notFound();
  const revisions = listBookmarkRevisions(bookmark.id);

  return (
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb
          items={[
            { href: "/bookmarks", label: "リンク集" },
            { href: `/bookmarks/${bookmark.id}`, label: bookmark.title },
          ]}
        />
        <PageTitle icon={History}>変更履歴</PageTitle>
      </div>
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>版</TableHead>
                <TableHead>日時</TableHead>
                <TableHead>更新者</TableHead>
                <TableHead>タイトル・URL</TableHead>
                <TableHead>要約</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((revision, index) => (
                <TableRow key={revision.id}>
                  <TableCell className="whitespace-nowrap">第{revision.number}版</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(revision.createdAt)}</TableCell>
                  <TableCell>
                    {revision.userName ?? "—"}
                    {revision.source === "mcp" && (
                      <Badge variant="secondary" className="ml-2">
                        MCP 経由
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="break-all whitespace-normal">
                    <div>{revision.title}</div>
                    <div className="text-xs text-muted-foreground">{revision.url}</div>
                  </TableCell>
                  <TableCell>{revision.summary}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {index === 0 ? (
                      <Badge variant="success">現在</Badge>
                    ) : (
                      canEdit(user) && (
                        <ConfirmAction
                          action={restoreBookmarkRevisionAction.bind(null, bookmark.id, revision.number)}
                          title={`第${revision.number}版に戻しますか？`}
                          description="この版の内容に戻します。現在の内容は履歴に残り、戻した内容が新しい版として保存されます。"
                          confirmLabel="この版に戻す"
                          trigger={
                            <Button variant="outline" size="sm">
                              <RotateCcw aria-hidden />
                              この版に戻す
                            </Button>
                          }
                        />
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
