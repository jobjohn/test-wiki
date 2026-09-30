import { Tag, Tags as TagsIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimpleBreadcrumb } from "@/components/Breadcrumbs";
import { PageList } from "@/components/PageList";
import { PageTitle } from "@/components/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="grid gap-4">
      <div>
        <SimpleBreadcrumb items={[{ href: "/tags", label: "タグ", icon: <TagsIcon className="size-3.5" aria-hidden /> }]} />
        <PageTitle icon={Tag}>{tag.name}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{pages.length} ページ</p>
      </div>
      <Card>
        <CardContent>
          <PageList pages={pages} />
        </CardContent>
      </Card>
    </div>
  );
}
