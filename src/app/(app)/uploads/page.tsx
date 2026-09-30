import { Paperclip, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { deleteUploadAction } from "@/actions/uploads";
import { ConfirmAction } from "@/components/ConfirmAction";
import { CopyText } from "@/components/CopyText";
import { PageTitle } from "@/components/PageTitle";
import { UploadForm } from "@/components/UploadForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { formatBytes, formatDateTime } from "@/lib/format";
import { isImage, listUploads, uploadMarkdown, uploadPath } from "@/lib/uploads";
import { canEdit } from "@/lib/users";

export const metadata: Metadata = { title: "ファイル" };

export default async function UploadsPage() {
  const { user } = await requireAccess();
  const uploads = listUploads();
  const editable = canEdit(user);

  return (
    <div className="grid gap-4">
      <PageTitle icon={Paperclip}>ファイル</PageTitle>
      {editable && <UploadForm />}
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
                  <TableHead>Markdown</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {isImage(upload.contentType) && <img src={uploadPath(upload)} alt="" className="max-h-12 max-w-16 rounded" />}
                    </TableCell>
                    <TableCell>
                      <a href={uploadPath(upload)} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                        {upload.filename}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatBytes(upload.byteSize)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(upload.createdAt)}</TableCell>
                    <TableCell>
                      <CopyText text={uploadMarkdown(upload)} />
                    </TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <ConfirmAction
                          action={deleteUploadAction.bind(null, upload.id)}
                          title="ファイルを削除しますか？"
                          description={`「${upload.filename}」を削除します。このファイルを使っているページでは、画像やリンクが表示されなくなります。`}
                          confirmLabel="削除する"
                          destructive
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`${upload.filename} を削除`}>
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
      ) : (
        <p className="text-muted-foreground">アップロードされたファイルはありません。</p>
      )}
    </div>
  );
}
