import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { first } from "@/lib/params";
import { recentRevisions } from "@/lib/pages";

export const metadata: Metadata = { title: "最近の更新" };
const PER_PAGE = 50;

export default async function ChangesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccess();
  const pageNumber = Math.max(Number.parseInt(first((await searchParams).page), 10) || 1, 1);
  const rows = recentRevisions(PER_PAGE + 1, (pageNumber - 1) * PER_PAGE);
  const revisions = rows.slice(0, PER_PAGE);

  return (
    <div className="grid gap-4">
      <PageTitle icon={History}>最近の更新</PageTitle>
      {revisions.length ? (
        <>
          <Card className="py-2">
            <CardContent className="px-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>ページ</TableHead>
                    <TableHead>版</TableHead>
                    <TableHead>編集者</TableHead>
                    <TableHead>要約</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((revision) => (
                    <TableRow key={revision.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(revision.createdAt)}</TableCell>
                      <TableCell>
                        <Link href={`/pages/${revision.pageId}`} className="text-link hover:underline">
                          {revision.pageTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/pages/${revision.pageId}/revisions/${revision.number}`} className="text-link hover:underline">
                          第{revision.number}版
                        </Link>
                      </TableCell>
                      <TableCell>{revision.userName ?? "—"}</TableCell>
                      <TableCell>{revision.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Pagination basePath="/changes" page={pageNumber} hasNext={rows.length > PER_PAGE} />
        </>
      ) : (
        <p className="text-muted-foreground">まだ更新はありません。</p>
      )}
    </div>
  );
}
