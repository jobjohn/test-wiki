import { Tag, Tags as TagsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { requireAccess } from "@/lib/access";
import { listTagsWithCounts } from "@/lib/pages";

export const metadata: Metadata = { title: "タグ" };

export default async function TagsPage() {
  await requireAccess();
  const tags = listTagsWithCounts();
  return (
    <div className="grid gap-5">
      <PageTitle icon={TagsIcon}>タグ</PageTitle>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="highlight" className="px-3 py-1 text-sm" asChild>
              <Link href={`/tags/${encodeURIComponent(tag.name)}`}>
                <Tag aria-hidden />
                {tag.name} <span className="opacity-70">{tag.count}</span>
              </Link>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">タグはまだありません。ページ編集画面でタグを付けられます。</p>
      )}
    </div>
  );
}
