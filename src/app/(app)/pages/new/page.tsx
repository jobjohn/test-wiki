import { FilePlus } from "lucide-react";
import type { Metadata } from "next";
import { PageForm } from "@/components/PageForm";
import { requireAccess } from "@/lib/access";
import { folderOptions, getFolder } from "@/lib/folders";
import { first } from "@/lib/params";
import { listTagNames } from "@/lib/pages";

export const metadata: Metadata = { title: "新規ページ" };

export default async function NewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccess("editor");
  const query = await searchParams;
  const folderId = /^\d+$/.test(first(query.folder_id)) && getFolder(Number(first(query.folder_id))) ? first(query.folder_id) : "";
  const title = first(query.title).slice(0, 200);

  return (
    <>
      <h1 className="page-title">
        <FilePlus size={26} aria-hidden /> 新規ページ作成
      </h1>
      <PageForm
        pageId={null}
        initial={{ title, body: "", folderId, position: "0", tags: "", lockVersion: 0 }}
        folders={folderOptions()}
        tagSuggestions={listTagNames()}
        cancelHref={folderId ? `/folders/${folderId}` : "/"}
      />
    </>
  );
}
