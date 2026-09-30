import { ArrowRight, BookOpen, Clock, FileText, Folder, FolderPlus, Pencil, Tag, Tags as TagsIcon } from "lucide-react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { PageList } from "@/components/PageList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccess } from "@/lib/access";
import { homePageTitle } from "@/lib/env";
import { listChildFolders } from "@/lib/folders";
import { countPages, findPageByTitle, listRecentPages, listTagsWithCounts } from "@/lib/pages";
import { canEdit, isAdmin } from "@/lib/users";

export default async function HomePage() {
  const { user, settings } = await requireAccess();
  const home = findPageByTitle(homePageTitle());
  const recent = listRecentPages(10);
  const tags = listTagsWithCounts();
  const folders = listChildFolders(null);

  return (
    <div className="grid gap-6">
      <section className="flex items-start gap-4 rounded-xl border bg-header p-5 text-header-foreground shadow-sm md:p-6">
        <span className="flex shrink-0 rounded-xl bg-highlight p-3 text-highlight-foreground">
          <BookOpen className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{settings.wikiName}</h1>
          {settings.description ? (
            <div className="mt-1 opacity-90 [&_.markdown-body_a]:text-inherit">
              <Markdown source={settings.description} />
            </div>
          ) : (
            isAdmin(user) && (
              <p className="mt-1 text-sm opacity-80">
                この Wiki の説明は
                <Link href="/settings" className="underline">
                  設定
                </Link>
                から追加できます。
              </p>
            )
          )}
        </div>
      </section>

      {home && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-[18px] text-primary" aria-hidden />
              <Link href={`/pages/${home.id}`} className="hover:underline">
                {home.title}
              </Link>
            </CardTitle>
            {canEdit(user) && (
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/pages/${home.id}/edit`}>
                    <Pencil aria-hidden />
                    編集
                  </Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <Markdown source={home.body} />
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-[18px] text-primary" aria-hidden />
              最近更新されたページ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {recent.length ? (
              <>
                <PageList pages={recent} />
                <Link href="/changes" className="inline-flex items-center gap-1 text-sm text-link hover:underline">
                  すべての更新履歴
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">
                まだページがありません。
                {canEdit(user) && (
                  <>
                    <Link href="/pages/new" className="text-link underline">
                      最初のページを作成
                    </Link>
                    しましょう。
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="size-[18px] text-primary" aria-hidden />
                フォルダ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {folders.length ? (
                <ul className="grid gap-1">
                  {folders.map((folder) => (
                    <li key={folder.id}>
                      <Link href={`/folders/${folder.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 text-link hover:bg-accent">
                        <Folder className="size-4 text-highlight-text" aria-hidden />
                        {folder.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">フォルダはまだありません。</p>
              )}
              {canEdit(user) && (
                <Button variant="outline" size="sm" className="w-fit" asChild>
                  <Link href="/folders/new">
                    <FolderPlus aria-hidden />
                    フォルダを作成
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagsIcon className="size-[18px] text-primary" aria-hidden />
                タグ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag.id} variant="highlight" asChild>
                      <Link href={`/tags/${encodeURIComponent(tag.name)}`}>
                        <Tag aria-hidden />
                        {tag.name} <span className="opacity-70">{tag.count}</span>
                      </Link>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">タグはまだありません。</p>
              )}
              <p className="text-sm text-muted-foreground">全 {countPages()} ページ</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
