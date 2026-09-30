"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** クリックでクリップボードにコピーする */
export function CopyText({ text, display, className }: { text: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="クリックでコピー"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* クリップボードを使えない環境 */
        }
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 text-left font-mono text-xs break-all transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
        copied && "border-success text-success",
        className,
      )}
    >
      <span>{display ?? text}</span>
      {copied ? <Check className="size-3 shrink-0" aria-hidden /> : <Copy className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="sr-only">{copied ? "コピーしました" : "コピー"}</span>
    </button>
  );
}
