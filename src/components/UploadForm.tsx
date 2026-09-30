"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_MB = 20;

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (files: File[]) => {
    setBusy(true);
    setError("");
    for (const file of files) {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: data, credentials: "same-origin" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(`${file.name}: ${json.error ?? "アップロードに失敗しました。"}`);
        break;
      }
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <div
      className={cn("mb-6 grid justify-items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors", dragOver && "border-primary bg-accent text-foreground")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void upload([...e.dataTransfer.files]);
      }}
    >
      <p>ここにファイルをドラッグ＆ドロップするか、ボタンから選択してください（最大 {MAX_MB}MB）。</p>
      <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden />
        {busy ? "アップロード中..." : "ファイルを選択"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void upload(files);
        }}
      />
      {error && (
        <Alert variant="destructive" className="text-left">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
