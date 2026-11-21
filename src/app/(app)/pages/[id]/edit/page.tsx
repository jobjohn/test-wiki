import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/PageForm";
import { PageTitle } from "@/components/PageTitle";
import { requireAccess } from "@/lib/access";
import { folderOptions } from "@/lib/folders";
import { parseId } from "@/lib/params";
import { getPage, listTagNames, tagList } from "@/lib/pages";
import { positionField } from "@/lib/form";

export const metadata: Metadata = { title: "ページを編集" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("edit");
  const id = parseId((await params).id);
  const page = getPage(id);
  if (!page) notFound();

  return (
    // 狭い画面ではタイトル以外を残りの高さに収め、保存バーを画面下に残す（本文欄がスクロールする）
    <div className="flex flex-col gap-5 max-md:-mb-16 max-md:h-[calc(100svh-var(--header-height)-1.5rem)] max-md:min-h-0">
      <PageTitle className="shrink-0" icon={Pencil}>ページを編集</PageTitle>
      <PageForm
        key={`${page.id}-${page.lockVersion}`}
        pageId={page.id}
        initial={{
          title: page.title,
          body: page.body,
          folderId: page.folderId === null ? "" : String(page.folderId),
          position: positionField(page.position),
          tags: tagList(page.id),
          lockVersion: page.lockVersion,
        }}
        folders={folderOptions()}
        tagSuggestions={listTagNames()}
        cancelHref={`/pages/${page.id}`}
      />
    </div>
  );
}
