import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Clock, FileText, History, RotateCcw, User, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevisionAction } from "@/actions/pages";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Markdown } from "@/components/Markdown";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAccess } from "@/lib/access";
import { hunks, lineDiff } from "@/lib/diff";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/params";
import { getPage, getRevision, latestRevision, listRevisions } from "@/lib/pages";
import { cn } from "@/lib/utils";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "版の詳細" };

const ROW = { "+": "bg-success/15", "-": "bg-destructive/15", "=": "" } as const;

export default async function RevisionPage({ params }: { params: Promise<{ id: string; number: string }> }) {
  const { user } = await requireAccess();
  const { id, number } = await params;
  const page = getPage(parseId(id));
  const revision = page && getRevision(page.id, parseId(number));
  if (!page || !revision) notFound();

  const all = listRevisions(page.id);
  const index = all.findIndex((r) => r.number === revision.number);
  const previous = all[index + 1];
  const next = all[index - 1];
  const diff = lineDiff(previous?.body ?? "", revision.body);
  const isCurrent = latestRevision(page.id)?.number === revision.number;

  return (
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb
          items={[
            { href: `/pages/${page.id}`, label: page.title, icon: <FileText className="size-3.5" aria-hidden /> },
            { href: `/pages/${page.id}/revisions`, label: "履歴", icon: <History className="size-3.5" aria-hidden /> },
          ]}
        />
        <PageTitle>
          {revision.title} <small className="text-base font-normal text-muted-foreground">第{revision.number}版</small>
        </PageTitle>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {formatDateTime(revision.createdAt)}
          </span>
          {revision.userName && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" aria-hidden /> {revision.userName}
            </span>
          )}
          {revision.summary && <span>{revision.summary}</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit(user) && !isCurrent && (
          <ConfirmAction
            action={restoreRevisionAction.bind(null, page.id, revision.number)}
            title={`第${revision.number}版に戻しますか？`}
            description="この版の内容に戻します。現在の内容は履歴に残り、戻した内容が新しい版として保存されます。"
            confirmLabel="この版に戻す"
            trigger={
              <Button>
                <RotateCcw aria-hidden />
                この版に戻す
              </Button>
            }
          />
        )}
        {previous && (
          <Button variant="outline" asChild>
            <Link href={`/pages/${page.id}/revisions/${previous.number}`}>
              <ArrowLeft aria-hidden />第{previous.number}版
            </Link>
          </Button>
        )}
        {next && (
          <Button variant="outline" asChild>
            <Link href={`/pages/${page.id}/revisions/${next.number}`}>
              第{next.number}版
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      <Collapsible defaultOpen className="group/diff">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="-ml-3">
            <ChevronRight className="transition-transform group-data-[state=open]/diff:rotate-90" aria-hidden />
            前の版からの差分
            <span className="font-mono text-sm font-normal">
              <span className="text-success">+{diff.additions}</span> <span className="text-destructive">-{diff.deletions}</span>
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {diff.changed ? (
            <Card className="mt-2 overflow-hidden py-0">
              <Table className="font-mono text-[13px]">
                <TableBody>
                  {hunks(diff.lines).map((hunk, i) =>
                    hunk === null ? (
                      <TableRow key={i} className="bg-muted text-center text-muted-foreground hover:bg-muted">
                        <TableCell colSpan={3} className="py-0.5">
                          ⋯
                        </TableCell>
                      </TableRow>
                    ) : (
                      hunk.map((line, j) => (
                        <TableRow key={`${i}-${j}`} className={cn("border-0", ROW[line.action])}>
                          <TableCell className="w-px border-r px-2 py-0 text-right text-muted-foreground select-none">{line.oldNumber}</TableCell>
                          <TableCell className="w-px border-r px-2 py-0 text-right text-muted-foreground select-none">{line.newNumber}</TableCell>
                          <TableCell className="px-2 py-0 break-all whitespace-pre-wrap">
                            <span className={cn("inline-block w-4 select-none", line.action === "=" && "text-muted-foreground")}>
                              {line.action === "=" ? " " : line.action}
                            </span>
                            {line.text}
                          </TableCell>
                        </TableRow>
                      ))
                    ),
                  )}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <p className="mt-2 text-muted-foreground">本文の変更はありません。</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="group/body">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="-ml-3">
            <ChevronRight className="transition-transform group-data-[state=open]/body:rotate-90" aria-hidden />
            この版の内容
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent>
              <Markdown source={revision.body} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
