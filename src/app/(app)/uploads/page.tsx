import { Paperclip, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { deleteUploadAction } from "@/actions/uploads";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyText } from "@/components/CopyText";
import { UploadForm } from "@/components/UploadForm";
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
    <>
      <h1 className="page-title">
        <Paperclip size={26} aria-hidden /> ファイル
      </h1>
      {editable && <UploadForm />}
      {uploads.length ? (
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>ファイル名</th>
              <th>サイズ</th>
              <th>日時</th>
              <th>Markdown</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload) => (
              <tr key={upload.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isImage(upload.contentType) && <img src={uploadPath(upload)} alt="" className="thumb" />}
                </td>
                <td>
                  <a href={uploadPath(upload)} target="_blank" rel="noopener noreferrer">
                    {upload.filename}
                  </a>
                </td>
                <td className="nowrap">{formatBytes(upload.byteSize)}</td>
                <td className="nowrap">{formatDateTime(upload.createdAt)}</td>
                <td>
                  <CopyText text={uploadMarkdown(upload)} />
                </td>
                <td>
                  {editable && (
                    <ConfirmButton
                      action={deleteUploadAction.bind(null, upload.id)}
                      message="このファイルを削除しますか？ページ内のリンクは表示されなくなります。"
                      className="icon-button icon-button-danger"
                      title="削除"
                    >
                      <Trash2 size={16} aria-hidden />
                    </ConfirmButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">アップロードされたファイルはありません。</p>
      )}
    </>
  );
}
