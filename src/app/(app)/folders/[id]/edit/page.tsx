import { FolderInput } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolderForm } from "@/components/FolderForm";
import { PageTitle } from "@/components/PageTitle";
import { requireAccess } from "@/lib/access";
import { folderOptions, getFolder, selfAndDescendantIds } from "@/lib/folders";
import { parseId } from "@/lib/params";

export const metadata: Metadata = { title: "フォルダの編集" };

export default async function EditFolderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("editor");
  const folder = getFolder(parseId((await params).id));
  if (!folder) notFound();

  return (
    <div className="grid max-w-2xl gap-5">
      <PageTitle icon={FolderInput}>フォルダの名前変更・移動</PageTitle>
      <FolderForm
        folderId={folder.id}
        initial={{ name: folder.name, parentId: folder.parentId === null ? "" : String(folder.parentId), position: String(folder.position) }}
        options={folderOptions(selfAndDescendantIds(folder.id))}
        cancelHref={`/folders/${folder.id}`}
      />
    </div>
  );
}
