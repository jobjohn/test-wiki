import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
            <Badge key={tag.id} variant="highlight" asChild>
              <Link href={`/tags/${encodeURIComponent(tag.name)}`}>
                <Tag aria-hidden />
                {tag.name} {tag.count}
              </Link>
            </Badge>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TagsIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>タグはまだありません</EmptyTitle>
            <EmptyDescription>ページ編集画面でタグを付けられます。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
