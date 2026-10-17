import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { listWriteLogs, safePurgeWriteLogs, WRITE_LOG_RETENTION_DAYS, writeToolLabel } from "@/lib/api-write-logs";
import { formatDateTime } from "@/lib/format";
import { first } from "@/lib/params";

export const metadata: Metadata = { title: "MCP の書き込みの記録" };
const PER_PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccess("admin");
  safePurgeWriteLogs();
  const pageNumber = Math.max(Number.parseInt(first((await searchParams).page), 10) || 1, 1);
  const rows = listWriteLogs(PER_PAGE + 1, (pageNumber - 1) * PER_PAGE);
  const logs = rows.slice(0, PER_PAGE);

  return (
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb items={[{ href: "/settings", label: "Wiki の設定" }]} />
        <PageTitle icon={ScrollText}>MCP の書き込みの記録</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">MCP 経由の書き込みの記録です。{WRITE_LOG_RETENTION_DAYS} 日（1 年）より古いものは自動で削除されます。</p>
      </div>
      {logs.length ? (
        <>
          <Card className="py-2">
            <CardContent className="px-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>トークン</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>対象</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const kindLabel = log.targetKind === "page" ? "ページ" : "リンク";
                    const href = log.targetTitle !== null ? `/${log.targetKind === "page" ? "pages" : "bookmarks"}/${log.targetId}` : null;
                    const label = log.targetTitle ?? `${kindLabel} #${log.targetId ?? "—"}（削除済み）`;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                        <TableCell>{log.userName ?? "（削除されたユーザー）"}</TableCell>
                        <TableCell>{log.tokenName}</TableCell>
                        <TableCell>{writeToolLabel(log.tool)}</TableCell>
                        <TableCell>
                          {href ? (
                            <Button variant="link" asChild className="h-auto p-0">
                              <Link href={href}>{label}</Link>
                            </Button>
                          ) : (
                            label
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Pagination basePath="/settings/audit" page={pageNumber} hasNext={rows.length > PER_PAGE} />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText aria-hidden />
            </EmptyMedia>
            <EmptyTitle>記録はありません</EmptyTitle>
            <EmptyDescription>MCP から書き込みがあると、ここに表示されます。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
