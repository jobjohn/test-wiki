"use client";

import { Save, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchUrlMetadataAction, saveBookmarkAction } from "@/actions/bookmarks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { BOOKMARK_DESCRIPTION_MAX_LENGTH, BOOKMARK_TITLE_MAX_LENGTH, BOOKMARK_URL_MAX_LENGTH, parseHttpUrl } from "@/lib/bookmark-utils";
import { Favicon } from "./Favicon";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";
import { TagPicker } from "./TagPicker";

export interface BookmarkFormValues {
  id: number | null;
  url: string;
  title: string;
  descriptionMd: string;
  tags: string[];
  faviconUrl: string | null;
}

export const EMPTY_BOOKMARK: BookmarkFormValues = { id: null, url: "", title: "", descriptionMd: "", tags: [], faviconUrl: null };

/**
 * リンクの追加・編集ダイアログ。
 * trigger を渡すとそのボタンで開く。メニューから開く場合などは open / onOpenChange で開閉する。
 */
export function BookmarkDialog({
  initial = EMPTY_BOOKMARK,
  tagSuggestions,
  trigger,
  open,
  onOpenChange,
}: {
  initial?: BookmarkFormValues;
  tagSuggestions: string[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (value: boolean) => {
    setInnerOpen(value);
    onOpenChange?.(value);
  };
  const editing = initial.id !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "リンクを編集" : "リンクを追加"}</DialogTitle>
          <DialogDescription>URL を入力すると、サイトのタイトルを自動で取得します。</DialogDescription>
        </DialogHeader>
        {/* 閉じるとフォームごと破棄されるので、次に開いたときは初期値から始まる */}
        {isOpen && <BookmarkForm initial={initial} tagSuggestions={tagSuggestions} onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type FetchState = { status: "idle" } | { status: "loading" } | { status: "done"; message?: string };

function BookmarkForm({ initial, tagSuggestions, onSaved }: { initial: BookmarkFormValues; tagSuggestions: string[]; onSaved: () => void }) {
  const [state, action] = useActionState(saveBookmarkAction, {});
  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [descriptionMd, setDescriptionMd] = useState(initial.descriptionMd);
  const [tags, setTags] = useState(initial.tags);
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [duplicate, setDuplicate] = useState<{ id: number; title: string } | null>(null);
  // 利用者がタイトルを入力したら、自動取得の結果で上書きしない
  const titleTouched = useRef(initial.title !== "");
  const lastFetched = useRef(initial.url.trim());
  const requestId = useRef(0);

  useEffect(() => {
    // 成功の通知は、サーバーアクションが画面共通の通知（フラッシュ）で出す
    if (state.notice) onSaved();
    else if (state.errors?.length) {
      toast.error("リンクを保存できませんでした。入力内容を確認してください。");
    }
    // state が変わったとき（送信の結果が返ったとき）だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const lookup = async () => {
    const value = url.trim();
    if (value === lastFetched.current) return;
    lastFetched.current = value;
    const id = ++requestId.current;
    setDuplicate(null);
    if (!parseHttpUrl(value)) {
      setFetchState(value ? { status: "done", message: "URL は http:// または https:// で始まる形式で入力してください。" } : { status: "idle" });
      return;
    }
    setFetchState({ status: "loading" });
    try {
      const result = await fetchUrlMetadataAction(value, initial.id);
      if (id !== requestId.current) return; // 古い結果は使わない
      setDuplicate(result.duplicate ?? null);
      setFaviconUrl(result.favicon ?? null);
      if (result.title && !titleTouched.current) setTitle(result.title);
      setFetchState({ status: "done", message: result.error });
    } catch {
      if (id !== requestId.current) return;
      setFetchState({ status: "done", message: "タイトルを取得できませんでした。手動で入力してください。" });
    }
  };

  return (
    <form action={action}>
      <FieldGroup>
        <FormErrors errors={state.errors} />
        {initial.id !== null && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="faviconUrl" value={faviconUrl ?? ""} />

        <Field>
          <FieldLabel htmlFor="bookmark-url">URL *</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Favicon src={faviconUrl} />
            </InputGroupAddon>
            <InputGroupInput
              id="bookmark-url"
              name="url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => void lookup()}
              required
              maxLength={BOOKMARK_URL_MAX_LENGTH}
              placeholder="https://example.com"
              autoFocus={initial.id === null}
              autoComplete="off"
            />
            {fetchState.status === "loading" && (
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            )}
          </InputGroup>
          {duplicate && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <AlertDescription>
                <p>
                  この URL は
                  <Button variant="link" asChild className="h-auto p-0">
                    <Link href={`/bookmarks/${duplicate.id}`} target="_blank">
                      「{duplicate.title}」
                    </Link>
                  </Button>
                  として登録済みです。
                </p>
              </AlertDescription>
            </Alert>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="bookmark-title">タイトル *</FieldLabel>
          <Input
            id="bookmark-title"
            name="title"
            value={title}
            onChange={(e) => {
              titleTouched.current = true;
              setTitle(e.target.value);
            }}
            required
            maxLength={BOOKMARK_TITLE_MAX_LENGTH}
            placeholder="サイト名など"
          />
          <FieldDescription aria-live="polite">
            {fetchState.status === "loading" ? "タイトルを取得中...（そのまま入力できます）" : fetchState.status === "done" && fetchState.message}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="bookmark-tags">タグ</FieldLabel>
          <TagPicker id="bookmark-tags" name="tags" value={tags} onChange={setTags} suggestions={tagSuggestions} />
        </Field>

        <Field>
          <FieldLabel htmlFor="bookmark-description">説明（Markdown 対応）</FieldLabel>
          <Textarea
            id="bookmark-description"
            name="descriptionMd"
            rows={4}
            value={descriptionMd}
            onChange={(e) => setDescriptionMd(e.target.value)}
            maxLength={BOOKMARK_DESCRIPTION_MAX_LENGTH}
            placeholder="どんな時に使うリンクか、など"
          />
        </Field>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </DialogClose>
          <SubmitButton pendingText="保存中...">
            <Save aria-hidden />
            {initial.id === null ? "リンクを追加" : "保存"}
          </SubmitButton>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
