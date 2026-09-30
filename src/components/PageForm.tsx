"use client";

import { Eye, Paperclip, Pencil, Save, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { savePageAction } from "@/actions/pages";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export interface PageFormValues {
  title: string;
  body: string;
  folderId: string;
  position: string;
  tags: string;
  lockVersion: number;
}

const MAX_TITLE = 200;

export function PageForm({
  pageId,
  initial,
  folders,
  tagSuggestions,
  cancelHref,
}: {
  pageId: number | null;
  initial: PageFormValues;
  folders: { id: number; label: string }[];
  tagSuggestions: string[];
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(savePageAction, {});
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [folderId, setFolderId] = useState(initial.folderId);
  const [position, setPosition] = useState(initial.position);
  const [tags, setTags] = useState(initial.tags);
  const [summary, setSummary] = useState("");
  const [lockVersion, setLockVersion] = useState(initial.lockVersion);
  const [conflictDismissed, setConflictDismissed] = useState(false);

  const [tab, setTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dirty =
    title !== initial.title || body !== initial.body || tags !== initial.tags || folderId !== initial.folderId || position !== initial.position;

  useEffect(() => setConflictDismissed(false), [state.conflict]);

  // 未保存の変更がある状態での離脱（タブを閉じる・別ページへの移動）に確認を出す
  useEffect(() => {
    if (!dirty || pending) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== location.origin || anchor.hasAttribute("download")) return;
      if (!window.confirm("保存していない変更があります。このページを離れますか？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, pending]);

  // Ctrl / ⌘ + S で保存
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const insertText = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? start;
    setBody((prev) => {
      const before = prev.slice(0, start);
      const prefix = before && !before.endsWith("\n") ? "\n" : "";
      return `${before}${prefix}${text}\n${prev.slice(end)}`;
    });
  };

  const showPreview = async () => {
    setTab("preview");
    setPreviewState("loading");
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error((await response.json()).error ?? response.statusText);
      setPreviewHtml((await response.json()).html);
      setPreviewState("idle");
    } catch {
      setPreviewState("error");
    }
  };

  const showWrite = () => {
    setTab("write");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const placeholder = `<!-- ${file.name} をアップロード中... -->`;
      insertText(placeholder);
      let replacement = "";
      try {
        const data = new FormData();
        data.append("file", file);
        const response = await fetch("/api/uploads", { method: "POST", body: data, credentials: "same-origin" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? response.statusText);
        replacement = json.markdown;
      } catch (error) {
        window.alert(`${file.name} のアップロードに失敗しました: ${error instanceof Error ? error.message : error}`);
      }
      setBody((prev) => prev.replace(`${placeholder}\n`, replacement ? `${replacement}\n` : "").replace(placeholder, replacement));
    }
  };

  const loadLatest = () => {
    const latest = state.conflict?.latest;
    if (!latest) return;
    setTitle(latest.title);
    setBody(latest.body);
    setTags(latest.tags);
    setFolderId(latest.folderId);
    setPosition(latest.position);
    setLockVersion(latest.lockVersion);
    setConflictDismissed(true);
  };

  return (
    <form ref={formRef} action={action} className="grid gap-5">
      <FormErrors errors={state.errors} />
      {state.conflict && !conflictDismissed && (
        <Alert variant="destructive" className="gap-y-2">
          <TriangleAlert aria-hidden />
          <AlertTitle>あなたが保存しようとした本文（コピーして残しておけます）</AlertTitle>
          <AlertDescription className="w-full gap-3">
            <Textarea readOnly rows={8} value={state.conflict.yourBody} onFocus={(e) => e.currentTarget.select()} className="bg-background font-mono text-foreground" />
            <Button type="button" variant="outline" onClick={loadLatest}>
              最新の内容を読み込む（この画面の編集内容は置き換わります）
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {pageId !== null && <input type="hidden" name="id" value={pageId} />}
      <input type="hidden" name="lockVersion" value={lockVersion} />

      <Field label="タイトル" htmlFor="title">
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={MAX_TITLE}
          autoFocus={!initial.title}
          placeholder="ページタイトル"
          className="h-10 text-base"
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-[1fr_1fr_7rem]">
        <Field label="フォルダ" htmlFor="folderId">
          <NativeSelect id="folderId" name="folderId" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">（トップ）</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="タグ" htmlFor="tags">
          <Input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} list="tag-suggestions" placeholder="カンマ・空白区切り（例: 手順書, 開発）" />
          <datalist id="tag-suggestions">
            {tagSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label="表示順" htmlFor="position">
          <Input type="number" id="position" name="position" step={1} value={position} onChange={(e) => setPosition(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-2">
        <Tabs value={tab} onValueChange={(v) => (v === "preview" ? void showPreview() : showWrite())}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="write">
                <Pencil aria-hidden />
                編集
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye aria-hidden />
                プレビュー
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Paperclip aria-hidden />
                ファイル添付
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    void uploadFiles(files);
                  }}
                />
              </label>
            </Button>
          </div>

          {/* 送信するため、編集欄は非表示のときも DOM に残す（forceMount） */}
          <TabsContent value="write" forceMount className="data-[state=inactive]:hidden">
            <Textarea
              ref={textareaRef}
              id="body"
              name="body"
              aria-label="本文（Markdown）"
              rows={22}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Markdown で記述できます。\n[[ページ名]] で他のページへリンク、画像はドラッグ＆ドロップや貼り付けで添付できます。"}
              className={cn("min-h-[26rem] resize-y font-mono text-sm leading-relaxed", dragOver && "border-primary ring-[3px] ring-primary/30")}
              onDragOver={(e) => {
                if ([...e.dataTransfer.types].includes("Files")) {
                  e.preventDefault();
                  setDragOver(true);
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                setDragOver(false);
                if (e.dataTransfer.files.length) {
                  e.preventDefault();
                  void uploadFiles([...e.dataTransfer.files]);
                }
              }}
              onPaste={(e) => {
                const files = [...e.clipboardData.files];
                if (files.length) {
                  e.preventDefault();
                  void uploadFiles(files);
                }
              }}
              onKeyDown={(e) => {
                const el = e.currentTarget;
                if (e.key === "Tab" && !e.shiftKey && !e.nativeEvent.isComposing && el.selectionStart === el.selectionEnd) {
                  e.preventDefault();
                  const pos = el.selectionStart;
                  setBody((prev) => `${prev.slice(0, pos)}  ${prev.slice(pos)}`);
                  requestAnimationFrame(() => el.setSelectionRange(pos + 2, pos + 2));
                }
              }}
            />
          </TabsContent>
          <TabsContent value="preview" forceMount className="data-[state=inactive]:hidden">
            <div className="min-h-[26rem] rounded-md border p-5">
              {previewState === "loading" && <p className="text-muted-foreground">プレビューを生成中...</p>}
              {previewState === "error" && (
                <Alert variant="destructive">
                  <AlertDescription className="text-destructive">プレビューを表示できませんでした。</AlertDescription>
                </Alert>
              )}
              {previewState === "idle" &&
                (previewHtml ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p className="text-muted-foreground">（内容がありません）</p>)}
            </div>
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          Markdown（GitHub 形式）対応 ・ <code className="rounded bg-muted px-1">[[ページ名]]</code> / <code className="rounded bg-muted px-1">[[ページ名|表示名]]</code> で Wiki リンク ・ Ctrl/⌘ + S で保存
        </p>
      </div>

      <Field label="変更内容の要約（任意）" htmlFor="summary">
        <Input id="summary" name="summary" maxLength={200} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="例: 手順を追記" />
      </Field>

      <div className="flex gap-2">
        <SubmitButton pendingText="保存中...">
          <Save aria-hidden />
          保存
        </SubmitButton>
        <Button variant="outline" asChild>
          <Link href={cancelHref}>キャンセル</Link>
        </Button>
      </div>
    </form>
  );
}
