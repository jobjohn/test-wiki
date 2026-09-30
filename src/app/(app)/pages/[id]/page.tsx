import { Clock, Download, History, Link as LinkIcon, Pencil, Trash2, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePageAction } from "@/actions/pages";
import { FolderBreadcrumbs } from "@/components/Breadcrumbs";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Markdown } from "@/components/Markdown";
import { Tags } from "@/components/Tags";
import { Toc } from "@/components/Toc";
import { canViewContent, requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { getFolder } from "@/lib/folders";
import { parseId } from "@/lib/params";
import { backlinksFor, getPage, latestRevision, tagsForPage } from "@/lib/pages";
import { canEdit } from "@/lib/users";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = /^\d+$/.test(id) && (await canViewContent()) ? getPage(Number(id)) : undefined;
  return { title: page?.title ?? "ページ" };
}

export default async function PageView({ params }: Props) {
  const { user } = await requireAccess();
  const page = getPage(parseId((await params).id));
  if (!page) notFound();

  const folder = page.folderId ? getFolder(page.folderId) : undefined;
  const revision = latestRevision(page.id);
  const backlinks = backlinksFor(page);
  const editable = canEdit(user);

  return (
    <article className="page">
      <header className="page-header">
        {folder && <FolderBreadcrumbs folder={folder} />}
        <h1>{page.title}</h1>
        <div className="page-meta muted small">
          <span>
            <Clock size={14} aria-hidden /> 最終更新 {formatDateTime(page.updatedAt)}
          </span>
          {revision && (
            <span>
              <History size={14} aria-hidden /> 第{revision.number}版
            </span>
          )}
          {revision?.userName && (
            <span>
              <User size={14} aria-hidden /> {revision.userName}
            </span>
          )}
        </div>
        <Tags tags={tagsForPage(page.id)} />
        <div className="page-actions">
          {editable && (
            <Link href={`/pages/${page.id}/edit`} className="button button-primary" accessKey="e">
              <Pencil size={18} aria-hidden />
              <span>編集</span>
            </Link>
          )}
          <Link href={`/pages/${page.id}/revisions`} className="button">
            <History size={18} aria-hidden />
            <span>履歴</span>
          </Link>
          <a href={`/pages/${page.id}/markdown?download=1`} className="button" download>
            <Download size={18} aria-hidden />
            <span>Markdown</span>
          </a>
          {editable && (
            <ConfirmButton
              action={deletePageAction.bind(null, page.id)}
              message={`ページ「${page.title}」を削除します。よろしいですか？`}
              className="button button-danger"
            >
              <Trash2 size={18} aria-hidden />
              <span>削除</span>
            </ConfirmButton>
          )}
        </div>
      </header>

      <Toc target=".page > .markdown-body" />

      {page.body.trim() ? <Markdown source={page.body} /> : <p className="muted">本文はまだありません。</p>}

      {backlinks.length > 0 && (
        <section className="related">
          <h2>
            <LinkIcon size={16} aria-hidden /> このページへのリンク
          </h2>
          <ul>
            {backlinks.map((link) => (
              <li key={link.id}>
                <Link href={`/pages/${link.id}`}>{link.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
