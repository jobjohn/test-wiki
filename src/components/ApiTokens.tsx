"use client";

import { KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useActionState } from "react";
import { createApiTokenAction, revokeApiTokenAction } from "@/actions/api-tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_TOKEN_EXPIRY, TOKEN_EXPIRIES, TOKEN_NAME_MAX_LENGTH } from "@/lib/api-token-options";
import { ConfirmAction } from "./ConfirmAction";
import { CopyText } from "./CopyText";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

/** 一覧の 1 行（日付はサーバーで整形済み） */
export interface ApiTokenRow {
  id: number;
  name: string;
  prefix: string;
  scope: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
}

/** MCP クライアントへの登録コマンド（トークンが分かっていればそれを埋める） */
export function connectCommand(origin: string, token = "<トークン>") {
  return `claude mcp add --transport http wiki ${origin}/api/mcp --header "Authorization: Bearer ${token}"`;
}

/** 発行フォーム。発行直後だけ、平文のトークンを 1 回表示する */
export function ApiTokenForm({ origin }: { origin: string }) {
  const [state, action] = useActionState(createApiTokenAction, {});
  return (
    <div className="grid gap-4">
      {state.token && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertDescription className="grid gap-3">
            <p>
              トークン「{state.token.name}」を発行しました。<strong>この画面を離れると再表示できません。</strong>今のうちにコピーしてください。
            </p>
            <CopyText text={state.token.value} className="h-auto break-all whitespace-normal" />
            <p>Claude Code に登録するコマンド:</p>
            <CopyText text={connectCommand(origin, state.token.value)} className="h-auto break-all whitespace-normal" />
          </AlertDescription>
        </Alert>
      )}
      <form action={action}>
        <FieldGroup>
          <FormErrors errors={state.errors} />
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field>
              <FieldLabel htmlFor="token-name">名前</FieldLabel>
              <Input id="token-name" name="name" maxLength={TOKEN_NAME_MAX_LENGTH} placeholder="例: 自分のノート PC の Claude Code" required defaultValue={state.values?.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="token-expiry">有効期限</FieldLabel>
              <NativeSelect id="token-expiry" name="expiry" defaultValue={state.values?.expiry ?? DEFAULT_TOKEN_EXPIRY}>
                {Object.entries(TOKEN_EXPIRIES).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div>
            <SubmitButton variant="outline" pendingText="発行中...">
              <Plus aria-hidden />
              トークンを発行
            </SubmitButton>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

/** 発行済みトークンの一覧と取り消し */
export function ApiTokenList({ tokens }: { tokens: ApiTokenRow[] }) {
  if (!tokens.length) return <p className="text-sm text-muted-foreground">発行済みのトークンはありません。</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>権限</TableHead>
          <TableHead>作成日</TableHead>
          <TableHead>最終使用</TableHead>
          <TableHead>有効期限</TableHead>
          <TableHead className="w-0">
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((token) => (
          <TableRow key={token.id}>
            <TableCell>
              <div className="font-medium">{token.name}</div>
              <code className="text-xs text-muted-foreground">{token.prefix}…</code>
            </TableCell>
            <TableCell>{token.scope}</TableCell>
            <TableCell>{token.createdAt}</TableCell>
            <TableCell>{token.lastUsedAt ?? "未使用"}</TableCell>
            <TableCell>
              {token.expired ? <Badge variant="destructive">期限切れ</Badge> : (token.expiresAt ?? "無期限")}
            </TableCell>
            <TableCell>
              <ConfirmAction
                action={revokeApiTokenAction.bind(null, token.id)}
                title="トークンを取り消しますか？"
                description={`「${token.name}」を取り消します。このトークンを使っている MCP クライアントは、すぐに接続できなくなります。`}
                confirmLabel="取り消す"
                destructive
                trigger={
                  <Button variant="outline" size="icon-sm" aria-label={`「${token.name}」を取り消す`} title="取り消し">
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** 接続方法の説明 */
export function McpGuide({ origin }: { origin: string }) {
  return (
    <div className="grid gap-2 text-sm">
      <p className="flex items-center gap-2">
        <KeyRound className="size-4" aria-hidden />
        この Wiki を AI（MCP 対応のクライアント）から読み取り専用で使えます。トークンを発行して、次のように登録してください。
      </p>
      <CopyText text={connectCommand(origin)} className="h-auto break-all whitespace-normal" />
      <p className="text-muted-foreground">
        URL は {origin}/api/mcp です。トークンは作成したユーザーの権限で動き、ユーザーを無効にすると使えなくなります。
      </p>
    </div>
  );
}
