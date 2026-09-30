import { FileText, History, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevisionAction } from "@/actions/pages";
import { ConfirmButton } from "@/components/ConfirmButton";
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
    <>
      <nav className="breadcrumbs">
        <Link href={`/pages/${page.id}`}>
          <FileText size={14} aria-hidden />
          {page.title}
        </Link>
      </nav>
      <h1 className="page-title">
        <History size={26} aria-hidden /> 変更履歴
      </h1>
      <table className="table">
        <thead>
          <tr>
            <th>版</th>
            <th>日時</th>
            <th>編集者</th>
            <th>タイトル</th>
            <th>要約</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision, index) => (
            <tr key={revision.id}>
              <td>
                <Link href={`/pages/${page.id}/revisions/${revision.number}`}>第{revision.number}版</Link>
              </td>
              <td className="nowrap">{formatDateTime(revision.createdAt)}</td>
              <td>{revision.userName ?? "—"}</td>
              <td>{revision.title}</td>
              <td>{revision.summary}</td>
              <td className="nowrap">
                {index === 0 ? (
                  <span className="badge">現在</span>
                ) : (
                  canEdit(user) && (
                    <ConfirmButton
                      action={restoreRevisionAction.bind(null, page.id, revision.number)}
                      message={`第${revision.number}版の内容に戻しますか？（新しい版として保存されます）`}
                      className="button button-small"
                    >
                      <RotateCcw size={14} aria-hidden />
                      <span>この版に戻す</span>
                    </ConfirmButton>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
