"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** クリックでクリップボードにコピーする */
export function CopyText({ text, display, className }: { text: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
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
      className={cn("h-auto max-w-full py-0.5 font-mono break-all whitespace-normal", copied && "border-success text-success", className)}
    >
      <span>{display ?? text}</span>
      {copied ? <Check data-icon="inline-end" aria-hidden /> : <Copy data-icon="inline-end" className="text-muted-foreground" aria-hidden />}
      <span className="sr-only">{copied ? "コピーしました" : "コピー"}</span>
    </Button>
  );
}
