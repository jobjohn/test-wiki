import { FilePlus, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageList } from "@/components/PageList";
import { Pagination } from "@/components/Pagination";
import { requireAccess } from "@/lib/access";
import { first } from "@/lib/params";
import { findPageByTitle, searchPages } from "@/lib/pages";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "検索" };
const PER_PAGE = 30;

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireAccess();
  const query = await searchParams;
  const q = first(query.q).trim().slice(0, 200);
  const pageNumber = Math.max(Number.parseInt(first(query.page), 10) || 1, 1);

  // 上部の検索ボックスから送信されたとき、タイトルが完全一致するページがあればそのまま開く
  const exact = q ? findPageByTitle(q) : undefined;
  if (first(query.go) && exact) redirect(`/pages/${exact.id}`);

  const result = q ? searchPages(q, PER_PAGE, (pageNumber - 1) * PER_PAGE) : { pages: [], total: 0 };

  return (
    <>
      <h1 className="page-title">
        <Search size={26} aria-hidden /> 検索
      </h1>
      <Form action="/search" className="search-form">
        <input type="search" name="q" defaultValue={q} placeholder="キーワード（空白区切りで AND 検索）" autoFocus={!q} />
        <button type="submit" className="button button-primary">
          <Search size={18} aria-hidden />
          <span>検索</span>
        </button>
      </Form>

      {q && (
        <>
          <p className="muted">
            「{q}」の検索結果: {result.total} 件
          </p>
          {canEdit(user) && !exact && (
            <p>
              <Link href={`/pages/new?title=${encodeURIComponent(q)}`}>
                <FilePlus size={16} aria-hidden /> ページ「{q}」を新規作成
              </Link>
            </p>
          )}
          <PageList pages={result.pages} query={q} />
          <Pagination basePath="/search" params={{ q }} page={pageNumber} hasNext={result.total > pageNumber * PER_PAGE} />
        </>
      )}
    </>
  );
}
