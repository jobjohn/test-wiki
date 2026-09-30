import { Info, Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteUserAction } from "@/actions/users";
import { ConfirmButton } from "@/components/ConfirmButton";
import { requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { listUsers, ROLES } from "@/lib/users";

export const metadata: Metadata = { title: "ユーザー管理" };

export default async function UsersPage() {
  const { user: me } = await requireAccess("admin");
  const users = listUsers();

  return (
    <>
      <header className="page-header page-header-flex">
        <h1 className="page-title">
          <Users size={26} aria-hidden /> ユーザー管理
        </h1>
        <Link href="/users/new" className="button button-primary">
          <UserPlus size={18} aria-hidden />
          <span>ユーザーを追加</span>
        </Link>
      </header>

      <table className="table">
        <thead>
          <tr>
            <th>ユーザー</th>
            <th>権限</th>
            <th>二段階認証</th>
            <th>最終ログイン</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <span className="user-cell">
                  <span className="avatar avatar-small">{Array.from(user.name)[0]?.toUpperCase()}</span>
                  <span>
                    <strong>{user.name}</strong>
                    <br />
                    <span className="muted small">@{user.username}</span>
                  </span>
                </span>
              </td>
              <td>
                <span className={`badge badge-${user.role}`}>{ROLES[user.role]}</span>
              </td>
              <td>
                {user.mfaEnabled ? (
                  <span className="status-on">
                    <ShieldCheck size={14} aria-hidden /> 有効
                  </span>
                ) : (
                  <span className="muted">未設定</span>
                )}
              </td>
              <td className="nowrap">{user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "—"}</td>
              <td className="nowrap">
                <Link href={`/users/${user.id}/edit`} className="icon-button" title="編集" aria-label={`${user.username} を編集`}>
                  <Pencil size={16} aria-hidden />
                </Link>
                {user.id !== me?.id && (
                  <ConfirmButton
                    action={deleteUserAction.bind(null, user.id)}
                    message={`ユーザー「${user.username}」を削除しますか？`}
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

      <div className="role-help card">
        <h2>
          <Info size={16} aria-hidden /> 権限について
        </h2>
        <ul>
          <li>
            <strong>管理者</strong>: すべての操作と Wiki の設定・ユーザー管理
          </li>
          <li>
            <strong>編集者</strong>: ページ・フォルダの作成と編集、ファイルのアップロード
          </li>
          <li>
            <strong>閲覧者</strong>: 閲覧のみ
          </li>
        </ul>
      </div>
    </>
  );
}
