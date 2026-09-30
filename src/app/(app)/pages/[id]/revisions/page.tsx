import { FileText, History, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevisionAction } from "@/actions/pages";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/params";
import { getPage, listRevisions } from "@/lib/pages";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "変更履歴" };

export default async function RevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAccess();
  const page = getPage(parseId((await params).id));
  if (!page) notFound();
  const revisions = listRevisions(page.id);

  return (
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb items={[{ href: `/pages/${page.id}`, label: page.title, icon: <FileText className="size-3.5" aria-hidden /> }]} />
        <PageTitle icon={History}>変更履歴</PageTitle>
      </div>
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>版</TableHead>
                <TableHead>日時</TableHead>
                <TableHead>編集者</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>要約</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((revision, index) => (
                <TableRow key={revision.id}>
                  <TableCell>
                    <Link href={`/pages/${page.id}/revisions/${revision.number}`} className="text-link hover:underline">
                      第{revision.number}版
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(revision.createdAt)}</TableCell>
                  <TableCell>{revision.userName ?? "—"}</TableCell>
                  <TableCell>{revision.title}</TableCell>
                  <TableCell>{revision.summary}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {index === 0 ? (
                      <Badge variant="success">現在</Badge>
                    ) : (
                      canEdit(user) && (
                        <ConfirmAction
                          action={restoreRevisionAction.bind(null, page.id, revision.number)}
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
