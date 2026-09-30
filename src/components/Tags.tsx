import { Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function Tags({ tags }: { tags: { id: number; name: string }[] }) {
  if (!tags.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="highlight" asChild>
          <Link href={`/tags/${encodeURIComponent(tag.name)}`}>
            <TagIcon aria-hidden />
            {tag.name}
          </Link>
        </Badge>
      ))}
    </span>
  );
}
