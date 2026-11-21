import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** サーバーで sanitize 済みの HTML として描画する（生の HTML は出力されない）。html を渡すと再変換しない */
export function Markdown({ source, html, className }: { source?: string; html?: string; className?: string }) {
  return <div className={cn("markdown-body", className)} dangerouslySetInnerHTML={{ __html: html ?? renderMarkdown(source ?? "") }} />;
}
