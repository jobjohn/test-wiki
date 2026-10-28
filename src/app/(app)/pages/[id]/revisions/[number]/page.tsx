import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Clock, Folder, RotateCcw, Tag, User, ChevronRight } from "lucide-react";
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
import { folderPathName, getFolder } from "@/lib/folders";
import { getPage, getRevision, latestRevision, listRevisions, restoreDescription, restoreScope } from "@/lib/pages";
import { canEdit } from "@/lib/users";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "版の詳細" };

const ACTION_BADGE = { "+": "success", "-": "destructive" } as const;

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
  const scope = restoreScope(revision);
  const folder = revision.folderId === null ? undefined : getFolder(revision.folderId);

  return (
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb
          items={[
            { href: `/pages/${page.id}`, label: page.title },
            { href: `/pages/${page.id}/revisions`, label: "履歴" },
          ]}
        />
        <PageTitle>
          {revision.title} <Badge variant="secondary">第{revision.number}版</Badge>
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
        {revision.tags === null ? (
          <p className="mt-1 text-sm text-muted-foreground">この版はタグとフォルダを記録する前の版です。</p>
        ) : (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Folder className="size-3.5" aria-hidden /> フォルダ: {folder ? folderPathName(folder) : revision.folderId === null ? "なし" : "（削除済み）"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3.5" aria-hidden /> タグ: {revision.tags || "なし"}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit(user) && !isCurrent && (
          <ConfirmAction
            action={restoreRevisionAction.bind(null, page.id, revision.number)}
            title={`第${revision.number}版に戻しますか？`}
            description={restoreDescription(scope)}
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
            <Badge variant="success">+{diff.additions}</Badge>
            <Badge variant="destructive">-{diff.deletions}</Badge>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {diff.changed ? (
            <Card className="mt-2 py-0">
              <Table>
                <TableBody>
                  {hunks(diff.lines).map((hunk, i) =>
                    hunk === null ? (
                      <TableRow key={i}>
                        <TableCell colSpan={3} className="text-center">
                          ⋯
                        </TableCell>
                      </TableRow>
                    ) : (
                      hunk.map((line, j) => (
                        <TableRow key={`${i}-${j}`}>
                          <TableCell className="w-px text-right select-none">{line.oldNumber}</TableCell>
                          <TableCell className="w-px text-right select-none">{line.newNumber}</TableCell>
                          <TableCell className="break-all whitespace-pre-wrap">
                            {line.action !== "=" && (
                              <Badge variant={ACTION_BADGE[line.action]} className="mr-2 select-none">
                                {line.action}
                              </Badge>
                            )}
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
