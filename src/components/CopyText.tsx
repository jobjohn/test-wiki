"use client";

import { useState } from "react";

/** クリックでクリップボードにコピーする */
export function CopyText({ text, display, className = "" }: { text: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <code
      className={`copyable${copied ? " copied" : ""} ${className}`}
      title="クリックでコピー"
      role="button"
      tabIndex={0}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* クリップボードを使えない環境 */
        }
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
    >
      {display ?? text}
    </code>
  );
}
