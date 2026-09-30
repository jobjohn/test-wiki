import { Tag, Tags as TagsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAccess } from "@/lib/access";
import { listTagsWithCounts } from "@/lib/pages";

export const metadata: Metadata = { title: "タグ" };

export default async function TagsPage() {
  await requireAccess();
  const tags = listTagsWithCounts();
  return (
    <>
      <h1 className="page-title">
        <TagsIcon size={26} aria-hidden /> タグ
      </h1>
      {tags.length ? (
        <div className="tag-cloud">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.name)}`} className="tag tag-large">
              <Tag size={14} aria-hidden />
              {tag.name} <span className="count">{tag.count}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">タグはまだありません。ページ編集画面でタグを付けられます。</p>
      )}
    </>
  );
}
