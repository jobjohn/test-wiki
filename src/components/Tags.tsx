import { Tag as TagIcon } from "lucide-react";
import Link from "next/link";

export function Tags({ tags }: { tags: { id: number; name: string }[] }) {
  if (!tags.length) return null;
  return (
    <span className="tags">
      {tags.map((tag) => (
        <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.name)}`} className="tag">
          <TagIcon size={12} aria-hidden />
          {tag.name}
        </Link>
      ))}
    </span>
  );
}
