import { FileText, Folder, FolderInput, FolderOpen, FolderPlus, FilePlus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteFolderAction } from "@/actions/folders";
import { FolderBreadcrumbs } from "@/components/Breadcrumbs";
import { ConfirmButton } from "@/components/ConfirmButton";
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

export default async function FolderPage({ params }: Props) {
  const { user } = await requireAccess();
  const folder = getFolder(parseId((await params).id));
  if (!folder) notFound();

  const children = listChildFolders(folder.id);
  const pages = listPagesInFolder(folder.id);
  const editable = canEdit(user);

  return (
    <>
      <header className="page-header">
        <FolderBreadcrumbs folder={folder} includeSelf={false} />
        <h1 className="page-title">
          <FolderOpen size={26} aria-hidden /> {folder.name}
        </h1>
        <p className="muted small">
          {children.length} フォルダ・{pages.length} ページ
        </p>
        {editable && (
          <div className="page-actions">
            <Link href={`/pages/new?folder_id=${folder.id}`} className="button button-primary">
              <FilePlus size={18} aria-hidden />
              <span>ページを追加</span>
            </Link>
            <Link href={`/folders/new?parent_id=${folder.id}`} className="button">
              <FolderPlus size={18} aria-hidden />
              <span>サブフォルダを作成</span>
            </Link>
            <Link href={`/folders/${folder.id}/edit`} className="button">
              <FolderInput size={18} aria-hidden />
              <span>名前変更・移動</span>
            </Link>
            <ConfirmButton
              action={deleteFolderAction.bind(null, folder.id)}
              message={`フォルダ「${folder.name}」を削除します。中のページやサブフォルダは 1 つ上の階層へ移動します。よろしいですか？`}
              className="button button-danger"
            >
              <Trash2 size={18} aria-hidden />
              <span>削除</span>
            </ConfirmButton>
          </div>
        )}
      </header>

      {children.length === 0 && pages.length === 0 ? (
        <div className="empty-state">
          <Folder size={40} aria-hidden />
          <p>このフォルダは空です。</p>
        </div>
      ) : (
        <ul className="folder-contents">
          {children.map((child) => {
            const counts = folderCounts(child.id);
            return (
              <li key={`f${child.id}`}>
                <Link href={`/folders/${child.id}`} className="folder-item">
                  <Folder size={20} className="folder-item-icon" aria-hidden />
                  <span className="folder-item-name">{child.name}</span>
                  <span className="muted small">
                    {counts.folders} フォルダ・{counts.pages} ページ
                  </span>
                </Link>
              </li>
            );
          })}
          {pages.map((page) => (
            <li key={`p${page.id}`}>
              <Link href={`/pages/${page.id}`} className="folder-item">
                <FileText size={20} className="folder-item-icon page-icon" aria-hidden />
                <span className="folder-item-name">{page.title}</span>
                <span className="muted small">{formatDateTime(page.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
