import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** サーバーで sanitize 済みの HTML として描画する（生の HTML は出力されない） */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={cn("markdown-body", className)} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
