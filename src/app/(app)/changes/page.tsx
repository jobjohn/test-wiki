import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
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
    <>
      <h1 className="page-title">
        <History size={26} aria-hidden /> 最近の更新
      </h1>
      {revisions.length ? (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>日時</th>
                <th>ページ</th>
                <th>版</th>
                <th>編集者</th>
                <th>要約</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((revision) => (
                <tr key={revision.id}>
                  <td className="nowrap">{formatDateTime(revision.createdAt)}</td>
                  <td>
                    <Link href={`/pages/${revision.pageId}`}>{revision.pageTitle}</Link>
                  </td>
                  <td className="nowrap">
                    <Link href={`/pages/${revision.pageId}/revisions/${revision.number}`}>第{revision.number}版</Link>
                  </td>
                  <td>{revision.userName ?? "—"}</td>
                  <td>{revision.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination basePath="/changes" page={pageNumber} hasNext={rows.length > PER_PAGE} />
        </>
      ) : (
        <p className="muted">まだ更新はありません。</p>
      )}
    </>
  );
}
