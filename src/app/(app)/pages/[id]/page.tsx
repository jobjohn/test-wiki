import { Clock, Download, History, Link as LinkIcon, Pencil, Trash2, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePageAction } from "@/actions/pages";
import { FolderBreadcrumbs } from "@/components/Breadcrumbs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Markdown } from "@/components/Markdown";
import { PageTitle } from "@/components/PageTitle";
import { Tags } from "@/components/Tags";
import { Toc } from "@/components/Toc";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      <header className="mb-5 grid gap-3 border-b pb-4">
        <div>
          {folder && <FolderBreadcrumbs folder={folder} />}
          <PageTitle>{page.title}</PageTitle>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> 最終更新 {formatDateTime(page.updatedAt)}
          </span>
          {revision && (
            <span className="inline-flex items-center gap-1">
              <History className="size-3.5" aria-hidden /> 第{revision.number}版
            </span>
          )}
          {revision?.userName && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" aria-hidden /> {revision.userName}
            </span>
          )}
        </div>
        <Tags tags={tagsForPage(page.id)} />
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button asChild>
              <Link href={`/pages/${page.id}/edit`} accessKey="e">
                <Pencil aria-hidden />
                編集
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/pages/${page.id}/revisions`}>
              <History aria-hidden />
              履歴
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/pages/${page.id}/markdown?download=1`} download>
              <Download aria-hidden />
              Markdown
            </a>
          </Button>
          {editable && (
            <ConfirmAction
              action={deletePageAction.bind(null, page.id)}
              title="ページを削除しますか？"
              description={`ページ「${page.title}」を削除します。変更履歴も一緒に削除され、元に戻せません。`}
              confirmLabel="削除する"
              destructive
              trigger={
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 aria-hidden />
                  削除
                </Button>
              }
            />
          )}
        </div>
      </header>

      <Toc target=".page > .markdown-body" />

      {page.body.trim() ? <Markdown source={page.body} /> : <p className="text-muted-foreground">本文はまだありません。</p>}

      {backlinks.length > 0 && (
        <section className="clear-both mt-10">
          <Separator className="mb-3" />
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
            <LinkIcon className="size-4" aria-hidden /> このページへのリンク
          </h2>
          <ul className="grid gap-1">
            {backlinks.map((link) => (
              <li key={link.id}>
                <Link href={`/pages/${link.id}`} className="text-link hover:underline">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
