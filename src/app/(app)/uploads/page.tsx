import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Paperclip, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteUploadAction } from "@/actions/uploads";
import { ConfirmAction } from "@/components/ConfirmAction";
import { CopyText } from "@/components/CopyText";
import { PageTitle } from "@/components/PageTitle";
import { Pagination } from "@/components/Pagination";
import { UploadForm } from "@/components/UploadForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { formatBytes, formatDateTime } from "@/lib/format";
import { first } from "@/lib/params";
import { isImage, isUploadFilter, listUploads, uploadMarkdown, uploadPath } from "@/lib/uploads";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "ファイル" };
const PER_PAGE = 50;

export default async function UploadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireAccess();
  const query = await searchParams;
  const filterParam = first(query.filter);
  const filter = isUploadFilter(filterParam) ? filterParam : "all";
  const pageNumber = Math.max(Number.parseInt(first(query.page), 10) || 1, 1);
  const { uploads, total } = listUploads({ filter, limit: PER_PAGE, offset: (pageNumber - 1) * PER_PAGE });
  const editable = canEdit(user);
  const params: Record<string, string> = filter === "all" ? {} : { filter };

  return (
    <div className="grid gap-4">
      <PageTitle icon={Paperclip}>ファイル</PageTitle>
      {editable && <UploadForm />}
      <nav aria-label="表示するファイル" className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant={filter === "all" ? "secondary" : "ghost"}>
          <Link href="/uploads" aria-current={filter === "all" ? "page" : undefined}>
            すべて
          </Link>
        </Button>
        <Button asChild size="sm" variant={filter === "unreferenced" ? "secondary" : "ghost"}>
          <Link href="/uploads?filter=unreferenced" aria-current={filter === "unreferenced" ? "page" : undefined}>
            どこからも参照されていないもの
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">{total} 件</span>
      </nav>
      {filter === "unreferenced" && (
        <p className="text-sm text-muted-foreground">
          ページ本文・リンク集の説明・ゴミ箱の中身のどこにも、このファイルへのリンクがないものです（過去の版からの参照は数えていません）。
        </p>
      )}
      {uploads.length ? (
        <Card className="py-2">
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>ファイル名</TableHead>
                  <TableHead>サイズ</TableHead>
                  <TableHead>日時</TableHead>
                  <TableHead>参照</TableHead>
                  <TableHead>Markdown</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {isImage(upload.contentType) && <img src={uploadPath(upload)} alt="" className="max-h-12 max-w-16" />}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" asChild className="h-auto p-0">
                        <a href={uploadPath(upload)} target="_blank" rel="noopener noreferrer">
                          {upload.filename}
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatBytes(upload.byteSize)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(upload.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{upload.referenced ? "あり" : <Badge variant="outline">未参照</Badge>}</TableCell>
                    <TableCell>
                      <CopyText text={uploadMarkdown(upload)} />
                    </TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <ConfirmAction
                          action={deleteUploadAction.bind(null, upload.id)}
                          title="ファイルをゴミ箱に移動しますか？"
                          description={`「${upload.filename}」をゴミ箱に移動します。このファイルを使っているページでは、画像やリンクが表示されなくなりますが、30 日以内ならゴミ箱から元に戻せます。`}
                          confirmLabel="ゴミ箱に移動する"
                          destructive
                          trigger={
                            <Button variant="destructive" size="icon-sm" aria-label={`${upload.filename} をゴミ箱に移動`}>
                              <Trash2 aria-hidden />
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      {uploads.length ? (
        <Pagination basePath="/uploads" params={params} page={pageNumber} hasNext={total > pageNumber * PER_PAGE} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Paperclip aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{filter === "unreferenced" ? "参照されていないファイルはありません" : "アップロードされたファイルはありません"}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
