import { ArrowRight, BookOpen, Clock, FileText, Folder, FolderPlus, Pencil, Tag, Tags as TagsIcon } from "lucide-react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { PageList } from "@/components/PageList";
import { PageTitle } from "@/components/PageTitle";
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
      <header className="grid gap-1">
        <PageTitle icon={BookOpen}>{settings.wikiName}</PageTitle>
        {settings.description ? (
          <div className="text-muted-foreground">
            <Markdown source={settings.description} />
          </div>
        ) : (
          isAdmin(user) && (
            <p className="text-sm text-muted-foreground">
              この Wiki の説明は
              <Button variant="link" asChild className="h-auto p-0">
                <Link href="/settings">設定</Link>
              </Button>
              から追加できます。
            </p>
          )
        )}
      </header>

      {home && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" aria-hidden />
              <Link href={`/pages/${home.id}`}>{home.title}</Link>
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
              <Clock className="size-4" aria-hidden />
              最近更新されたページ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {recent.length ? (
              <>
                <PageList pages={recent} />
                <Button variant="link" asChild className="h-auto p-0">
                  <Link href="/changes">
                    すべての更新履歴
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                まだページがありません。
                {canEdit(user) && (
                  <>
                    <Button variant="link" asChild className="h-auto p-0">
                      <Link href="/pages/new">最初のページを作成</Link>
                    </Button>
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
                <Folder className="size-4" aria-hidden />
                フォルダ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {folders.length ? (
                <ul className="grid gap-1">
                  {folders.map((folder) => (
                    <li key={folder.id}>
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link href={`/folders/${folder.id}`}>
                          <Folder className="size-4" aria-hidden />
                          {folder.name}
                        </Link>
                      </Button>
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
                <TagsIcon className="size-4" aria-hidden />
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
                        {tag.name} {tag.count}
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
