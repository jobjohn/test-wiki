import { FilePlus, FileText, Folder, FolderInput, FolderOpen, FolderPlus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteFolderAction } from "@/actions/folders";
import { FolderBreadcrumbs } from "@/components/Breadcrumbs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { canViewContent, requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { folderCounts, getFolder, listChildFolders } from "@/lib/folders";
import { parseId } from "@/lib/params";
import { listPagesInFolder } from "@/lib/pages";
import { canEdit } from "@/lib/users";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const folder = /^\d+$/.test(id) && (await canViewContent()) ? getFolder(Number(id)) : undefined;
  return { title: folder?.name ?? "フォルダ" };
}

const itemClass = "grid grid-cols-[auto_1fr] gap-x-3 rounded-lg border p-3 transition-colors hover:border-primary hover:bg-accent";

export default async function FolderPage({ params }: Props) {
  const { user } = await requireAccess();
  const folder = getFolder(parseId((await params).id));
  if (!folder) notFound();

  const children = listChildFolders(folder.id);
  const pages = listPagesInFolder(folder.id);
  const editable = canEdit(user);

  return (
    <div className="grid gap-5">
      <header className="grid gap-2 border-b pb-4">
        <div>
          <FolderBreadcrumbs folder={folder} includeSelf={false} />
          <PageTitle icon={FolderOpen}>{folder.name}</PageTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {children.length} フォルダ・{pages.length} ページ
        </p>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/pages/new?folder_id=${folder.id}`}>
                <FilePlus aria-hidden />
                ページを追加
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/folders/new?parent_id=${folder.id}`}>
                <FolderPlus aria-hidden />
                サブフォルダを作成
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/folders/${folder.id}/edit`}>
                <FolderInput aria-hidden />
                名前変更・移動
              </Link>
            </Button>
            <ConfirmAction
              action={deleteFolderAction.bind(null, folder.id)}
              title="フォルダを削除しますか？"
              description={`フォルダ「${folder.name}」を削除します。中のページやサブフォルダは削除されず、1 つ上の階層へ移動します。`}
              confirmLabel="削除する"
              destructive
              trigger={
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 aria-hidden />
                  削除
                </Button>
              }
            />
          </div>
        )}
      </header>

      {children.length === 0 && pages.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed p-10 text-muted-foreground">
          <Folder className="size-10" aria-hidden />
          <p>このフォルダは空です。</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => {
            const counts = folderCounts(child.id);
            return (
              <li key={`f${child.id}`}>
                <Link href={`/folders/${child.id}`} className={itemClass}>
                  <Folder className="row-span-2 mt-0.5 size-5 text-highlight-text" aria-hidden />
                  <span className="truncate font-semibold">{child.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {counts.folders} フォルダ・{counts.pages} ページ
                  </span>
                </Link>
              </li>
            );
          })}
          {pages.map((page) => (
            <li key={`p${page.id}`}>
              <Link href={`/pages/${page.id}`} className={itemClass}>
                <FileText className="row-span-2 mt-0.5 size-5 text-primary" aria-hidden />
                <span className="truncate font-semibold">{page.title}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(page.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
