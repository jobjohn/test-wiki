import { FolderPlus } from "lucide-react";
import type { Metadata } from "next";
import { FolderForm } from "@/components/FolderForm";
import { requireAccess } from "@/lib/access";
import { folderOptions, getFolder } from "@/lib/folders";
import { first } from "@/lib/params";

export const metadata: Metadata = { title: "新しいフォルダ" };

export default async function NewFolderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccess("editor");
  const raw = first((await searchParams).parent_id);
  const parentId = /^\d+$/.test(raw) && getFolder(Number(raw)) ? raw : "";

  return (
    <>
      <h1 className="page-title">
        <FolderPlus size={26} aria-hidden /> 新しいフォルダ
      </h1>
      <FolderForm folderId={null} initial={{ name: "", parentId, position: "0" }} options={folderOptions()} cancelHref={parentId ? `/folders/${parentId}` : "/"} />
    </>
  );
}
