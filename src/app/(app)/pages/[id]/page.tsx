import { Clock, History, Link as LinkIcon, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderBreadcrumbs } from "@/components/Breadcrumbs";
import { LikeButton } from "@/components/LikeButton";
import { Markdown } from "@/components/Markdown";
import { PageActions } from "@/components/PageActions";
import { PageTitle } from "@/components/PageTitle";
import { Tags } from "@/components/Tags";
import { Toc } from "@/components/Toc";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { canViewContent, requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { getFolder } from "@/lib/folders";
import { pageLikes } from "@/lib/page-likes";
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
      <header className="mb-4 grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {folder && <FolderBreadcrumbs folder={folder} />}
            <PageTitle>{page.title}</PageTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LikeButton pageId={page.id} initial={pageLikes(page.id, user?.id ?? null)} canLike={user !== null} />
            <PageActions pageId={page.id} title={page.title} editable={editable} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
          <Tags tags={tagsForPage(page.id)} />
        </div>
      </header>

      <Toc target=".page > .markdown-body" />

      {page.body.trim() ? <Markdown source={page.body} /> : <p className="text-muted-foreground">本文はまだありません。</p>}

      {backlinks.length > 0 && (
        <section className="clear-both mt-10">
          <Separator className="mb-3" />
          <h2 className="mb-2 flex items-center gap-1.5">
            <LinkIcon className="size-4" aria-hidden /> このページへのリンク
          </h2>
          <ul className="grid gap-1">
            {backlinks.map((link) => (
              <li key={link.id}>
                <Button variant="link" asChild className="h-auto p-0">
                  <Link href={`/pages/${link.id}`}>{link.title}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
