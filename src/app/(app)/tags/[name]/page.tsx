import { Tag, Tags as TagsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageList } from "@/components/PageList";
import { canViewContent, requireAccess } from "@/lib/access";
import { safeDecode } from "@/lib/params";
import { findTagByName, pagesForTag } from "@/lib/pages";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await canViewContent()) ? `タグ: ${safeDecode((await params).name)}` : "タグ" };
}

export default async function TagPage({ params }: Props) {
  await requireAccess();
  const tag = findTagByName(safeDecode((await params).name));
  if (!tag) notFound();
  const pages = pagesForTag(tag.id);

  return (
    <>
      <nav className="breadcrumbs">
        <Link href="/tags">
          <TagsIcon size={14} aria-hidden />
          タグ
        </Link>
      </nav>
      <h1 className="page-title">
        <Tag size={26} aria-hidden /> {tag.name}
      </h1>
      <p className="muted">{pages.length} ページ</p>
      <PageList pages={pages} />
    </>
  );
}
