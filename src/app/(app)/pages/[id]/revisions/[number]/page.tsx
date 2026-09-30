import { ArrowLeft, ArrowRight, ChevronRight, Clock, FileText, History, RotateCcw, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevisionAction } from "@/actions/pages";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Markdown } from "@/components/Markdown";
import { requireAccess } from "@/lib/access";
import { hunks, lineDiff } from "@/lib/diff";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/params";
import { getPage, getRevision, latestRevision, listRevisions } from "@/lib/pages";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "版の詳細" };

const ROW_CLASS = { "+": "diff-add", "-": "diff-del", "=": "diff-eq" } as const;

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
    <>
      <nav className="breadcrumbs">
        <Link href={`/pages/${page.id}`}>
          <FileText size={14} aria-hidden />
          {page.title}
        </Link>
        <span className="sep">
          <ChevronRight size={14} aria-hidden />
        </span>
        <Link href={`/pages/${page.id}/revisions`}>
          <History size={14} aria-hidden />
          履歴
        </Link>
      </nav>
      <h1 className="page-title">
        {revision.title} <small className="muted">第{revision.number}版</small>
      </h1>
      <p className="muted small">
        <Clock size={14} aria-hidden /> {formatDateTime(revision.createdAt)}
        {revision.userName && (
          <>
            {" ・ "}
            <User size={14} aria-hidden /> {revision.userName}
          </>
        )}
        {revision.summary && <> ・ {revision.summary}</>}
      </p>

      <div className="page-actions">
        {canEdit(user) && !isCurrent && (
          <ConfirmButton
            action={restoreRevisionAction.bind(null, page.id, revision.number)}
            message={`第${revision.number}版の内容に戻しますか？`}
            className="button button-primary"
          >
            <RotateCcw size={18} aria-hidden />
            <span>この版に戻す</span>
          </ConfirmButton>
        )}
        {previous && (
          <Link href={`/pages/${page.id}/revisions/${previous.number}`} className="button">
            <ArrowLeft size={18} aria-hidden />
            <span>第{previous.number}版</span>
          </Link>
        )}
        {next && (
          <Link href={`/pages/${page.id}/revisions/${next.number}`} className="button">
            <span>第{next.number}版</span>
            <ArrowRight size={18} aria-hidden />
          </Link>
        )}
      </div>

      <div className="diff-tabs">
        <details open>
          <summary>
            <strong>前の版からの差分</strong>
            <span className="diff-stat">
              <span className="added">+{diff.additions}</span> <span className="removed">-{diff.deletions}</span>
            </span>
          </summary>
          {diff.changed ? (
            <table className="diff">
              <tbody>
                {hunks(diff.lines).map((hunk, i) =>
                  hunk === null ? (
                    <tr key={i} className="diff-skip">
                      <td colSpan={3}>⋯</td>
                    </tr>
                  ) : (
                    hunk.map((line, j) => (
                      <tr key={`${i}-${j}`} className={ROW_CLASS[line.action]}>
                        <td className="ln">{line.oldNumber}</td>
                        <td className="ln">{line.newNumber}</td>
                        <td className="code">
                          <span className="mark">{line.action === "=" ? " " : line.action}</span>
                          {line.text}
                        </td>
                      </tr>
                    ))
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <p className="muted">本文の変更はありません。</p>
          )}
        </details>
        <details>
          <summary>
            <strong>この版の内容</strong>
          </summary>
          <Markdown source={revision.body} />
        </details>
      </div>
    </>
  );
}
