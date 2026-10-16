import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/PageForm";
import { PageTitle } from "@/components/PageTitle";
import { requireAccess } from "@/lib/access";
import { folderOptions } from "@/lib/folders";
import { parseId } from "@/lib/params";
import { getPage, listTagNames, tagList } from "@/lib/pages";

export const metadata: Metadata = { title: "ページを編集" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("editor");
  const id = parseId((await params).id);
  const page = getPage(id);
  if (!page) notFound();

  return (
    <div className="grid gap-5">
      <PageTitle icon={Pencil}>ページを編集</PageTitle>
      <PageForm
        key={`${page.id}-${page.lockVersion}`}
        pageId={page.id}
        initial={{
          title: page.title,
          body: page.body,
          folderId: page.folderId === null ? "" : String(page.folderId),
          position: String(page.position),
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
