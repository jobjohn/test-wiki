import { Info, Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteUserAction } from "@/actions/users";
import { ConfirmAction } from "@/components/ConfirmAction";
import { PageTitle } from "@/components/PageTitle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { listUsers, ROLES } from "@/lib/users";

export const metadata: Metadata = { title: "ユーザー管理" };

const ROLE_VARIANT = { admin: "highlight", editor: "secondary", viewer: "outline" } as const;

export default async function UsersPage() {
  const { user: me } = await requireAccess("admin");
  const users = listUsers();

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={Users}>ユーザー管理</PageTitle>
        <Button asChild>
          <Link href="/users/new">
            <UserPlus aria-hidden />
            ユーザーを追加
          </Link>
        </Button>
      </header>

      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>二段階認証</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{Array.from(user.name)[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="grid leading-tight">
                        <strong>{user.name}</strong>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[user.role]}>{ROLES[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.mfaEnabled ? (
                      <Badge variant="success">
                        <ShieldCheck aria-hidden />
                        有効
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">未設定</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/users/${user.id}/edit`} aria-label={`${user.username} を編集`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    {user.id !== me?.id && (
                      <ConfirmAction
                        action={deleteUserAction.bind(null, user.id)}
                        title="ユーザーを削除しますか？"
                        description={`ユーザー「${user.username}」を削除します。このユーザーが残した変更履歴は残ります。`}
                        confirmLabel="削除する"
                        destructive
                        trigger={
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`${user.username} を削除`}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-primary" aria-hidden />
            権限について
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
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
        </CardContent>
      </Card>
    </div>
  );
}
