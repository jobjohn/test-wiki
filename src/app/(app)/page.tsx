import { ArrowRight, BookOpen, Clock, FileText, Folder, FolderPlus, Pencil, Tags as TagsIcon, Tag } from "lucide-react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { PageList } from "@/components/PageList";
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
    <>
      <section className="hero">
        <div className="hero-mark">
          <BookOpen size={28} aria-hidden />
        </div>
        <div>
          <h1>{settings.wikiName}</h1>
          {settings.description ? (
            <div className="hero-description">
              <Markdown source={settings.description} />
            </div>
          ) : (
            isAdmin(user) && (
              <p className="muted">
                この Wiki の説明は<Link href="/settings">設定</Link>から追加できます。
              </p>
            )
          )}
        </div>
      </section>

      {home && (
        <article className="page card">
          <header className="card-header">
            <h2>
              <FileText size={18} aria-hidden /> <Link href={`/pages/${home.id}`}>{home.title}</Link>
            </h2>
            {canEdit(user) && (
              <Link href={`/pages/${home.id}/edit`} className="button button-small">
                <Pencil size={14} aria-hidden />
                <span>編集</span>
              </Link>
            )}
          </header>
          <Markdown source={home.body} />
        </article>
      )}

      <div className="dashboard">
        <section className="card">
          <header className="card-header">
            <h2>
              <Clock size={18} aria-hidden /> 最近更新されたページ
            </h2>
          </header>
          {recent.length ? (
            <>
              <PageList pages={recent} />
              <p>
                <Link href="/changes" className="link-more">
                  すべての更新履歴
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </p>
            </>
          ) : (
            <p className="muted">
              まだページがありません。
              {canEdit(user) && (
                <>
                  <Link href="/pages/new">最初のページを作成</Link>しましょう。
                </>
              )}
            </p>
          )}
        </section>

        <div className="dashboard-side">
          <section className="card">
            <header className="card-header">
              <h2>
                <Folder size={18} aria-hidden /> フォルダ
              </h2>
            </header>
            {folders.length ? (
              <ul className="folder-list">
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <Link href={`/folders/${folder.id}`}>
                      <Folder size={16} aria-hidden />
                      <span>{folder.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">フォルダはまだありません。</p>
            )}
            {canEdit(user) && (
              <Link href="/folders/new" className="button button-small">
                <FolderPlus size={14} aria-hidden />
                <span>フォルダを作成</span>
              </Link>
            )}
          </section>

          <section className="card">
            <header className="card-header">
              <h2>
                <TagsIcon size={18} aria-hidden /> タグ
              </h2>
            </header>
            {tags.length ? (
              <div className="tag-cloud">
                {tags.map((tag) => (
                  <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.name)}`} className="tag">
                    <Tag size={12} aria-hidden />
                    {tag.name} <span className="count">{tag.count}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted small">タグはまだありません。</p>
            )}
            <p className="muted small">全 {countPages()} ページ</p>
          </section>
        </div>
      </div>
    </>
  );
}
