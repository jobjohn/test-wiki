import { ArrowLeft, ArrowRight, Clock, FileText, History, RotateCcw, User } from "lucide-react";
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

      <details open className="group">
        <summary className="cursor-pointer py-1 font-semibold">
          前の版からの差分
          <span className="ml-2 font-mono text-sm font-normal">
            <span className="text-success">+{diff.additions}</span> <span className="text-destructive">-{diff.deletions}</span>
          </span>
        </summary>
        {diff.changed ? (
          <Card className="mt-2 overflow-hidden py-0">
            <table className="w-full border-collapse font-mono text-[13px]">
              <tbody>
                {hunks(diff.lines).map((hunk, i) =>
                  hunk === null ? (
                    <tr key={i} className="bg-muted text-center text-muted-foreground">
                      <td colSpan={3}>⋯</td>
                    </tr>
                  ) : (
                    hunk.map((line, j) => (
                      <tr key={`${i}-${j}`} className={ROW[line.action]}>
                        <td className="w-px border-r px-2 text-right text-muted-foreground select-none">{line.oldNumber}</td>
                        <td className="w-px border-r px-2 text-right text-muted-foreground select-none">{line.newNumber}</td>
                        <td className="px-2 break-all whitespace-pre-wrap">
                          <span className={cn("inline-block w-4 select-none", line.action === "=" && "text-muted-foreground")}>{line.action === "=" ? " " : line.action}</span>
                          {line.text}
                        </td>
                      </tr>
                    ))
                  ),
                )}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="mt-2 text-muted-foreground">本文の変更はありません。</p>
        )}
      </details>

      <details>
        <summary className="cursor-pointer py-1 font-semibold">この版の内容</summary>
        <Card className="mt-2">
          <CardContent>
            <Markdown source={revision.body} />
          </CardContent>
        </Card>
      </details>
    </div>
  );
}
