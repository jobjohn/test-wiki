"use client";

import { KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { createApiTokenAction, revokeApiTokenAction } from "@/actions/api-tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_TOKEN_EXPIRY,
  DEFAULT_TOKEN_SCOPE,
  isTokenExpiry,
  isTokenScope,
  isWritableExpiry,
  type TokenScope,
  TOKEN_EXPIRIES,
  TOKEN_NAME_MAX_LENGTH,
  TOKEN_SCOPES,
} from "@/lib/api-token-options";
import { ConfirmAction } from "./ConfirmAction";
import { CopyText } from "./CopyText";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

/** 一覧の 1 行（日付はサーバーで整形済み） */
export interface ApiTokenRow {
  id: number;
  name: string;
  prefix: string;
  /** 権限の表示名（「読み取り」など） */
  scope: string;
  /** 書き込み権限のトークンだが、設定で書き込みが許可されていない（今は読み取りしか使えない） */
  writeInactive?: boolean;
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
export function ApiTokenForm({ origin, writeEnabled = false }: { origin: string; writeEnabled?: boolean }) {
  const [state, action] = useActionState(createApiTokenAction, {});
  const initialScope = state.values?.scope && isTokenScope(state.values.scope) ? state.values.scope : DEFAULT_TOKEN_SCOPE;
  const [scope, setScope] = useState<TokenScope>(writeEnabled ? initialScope : "read");
  const initialExpiry = state.values?.expiry && isTokenExpiry(state.values.expiry) ? state.values.expiry : DEFAULT_TOKEN_EXPIRY;
  const [expiry, setExpiry] = useState<string>(initialExpiry);
  const writing = scope === "write";
  // 書き込みトークンは無期限にできない。選べない状態のまま送らないよう、選択肢から外す
  const expiries = Object.entries(TOKEN_EXPIRIES).filter(([value]) => !writing || isWritableExpiry(value as keyof typeof TOKEN_EXPIRIES));
  const expiryValue = expiries.some(([value]) => value === expiry) ? expiry : DEFAULT_TOKEN_EXPIRY;
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
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem_14rem]">
            <Field>
              <FieldLabel htmlFor="token-name">名前</FieldLabel>
              <Input id="token-name" name="name" maxLength={TOKEN_NAME_MAX_LENGTH} placeholder="例: 自分のノート PC の Claude Code" required defaultValue={state.values?.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="token-scope">権限</FieldLabel>
              <NativeSelect id="token-scope" name="scope" value={scope} onChange={(e) => setScope(isTokenScope(e.target.value) ? e.target.value : "read")}>
                <option value="read">{TOKEN_SCOPES.read}</option>
                <option value="write" disabled={!writeEnabled}>
                  {TOKEN_SCOPES.write}
                </option>
              </NativeSelect>
              {!writeEnabled && <FieldDescription>書き込みは、管理者が設定で許可すると選べます。</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel htmlFor="token-expiry">有効期限</FieldLabel>
              <NativeSelect id="token-expiry" name="expiry" value={expiryValue} onChange={(e) => setExpiry(e.target.value)}>
                {expiries.map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {writing && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <AlertDescription>
                書き込み権限のトークンを持つ AI は、あなたの権限で Wiki のページやリンクを作成・書き換えできます。信頼できるクライアントだけに使ってください。書き込みトークンは無期限にできません。
              </AlertDescription>
            </Alert>
          )}
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
            <TableCell>
              {token.scope}
              {token.writeInactive && (
                <div>
                  <Badge variant="outline">書き込みは現在無効</Badge>
                </div>
              )}
            </TableCell>
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
export function McpGuide({ origin, writeEnabled = false }: { origin: string; writeEnabled?: boolean }) {
  return (
    <div className="grid gap-2 text-sm">
      <p className="flex items-center gap-2">
        <KeyRound className="size-4" aria-hidden />
        {writeEnabled
          ? "この Wiki を AI（MCP 対応のクライアント）から読み取り、または読み取り・書き込みで使えます。トークンを発行して、次のように登録してください。"
          : "この Wiki を AI（MCP 対応のクライアント）から読み取り専用で使えます。トークンを発行して、次のように登録してください。"}
      </p>
      <CopyText text={connectCommand(origin)} className="h-auto break-all whitespace-normal" />
      <p className="text-muted-foreground">
        URL は {origin}/api/mcp です。トークンは作成したユーザーの権限で動き、ユーザーを無効にすると使えなくなります。{writeEnabled ? "" : "書き込みを使うには、管理者が設定で「MCP からの書き込みを許可」する必要があります。"}
      </p>
    </div>
  );
}
