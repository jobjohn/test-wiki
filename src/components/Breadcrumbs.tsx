import { ChevronRight, Folder, House } from "lucide-react";
import Link from "next/link";
import { ancestorsOf, type Folder as FolderType } from "@/lib/folders";

/** ホーム > 親フォルダ > … のパンくずリスト（includeSelf でそのフォルダ自身も含める） */
export function FolderBreadcrumbs({ folder, includeSelf = true }: { folder: FolderType; includeSelf?: boolean }) {
  const chain = includeSelf ? [...ancestorsOf(folder), folder] : ancestorsOf(folder);
  return (
    <nav className="breadcrumbs" aria-label="パンくずリスト">
      <Link href="/" title="ホーム" aria-label="ホーム">
        <House size={14} aria-hidden />
      </Link>
      {chain.map((f) => (
        <span key={f.id} className="crumb">
          <span className="sep">
            <ChevronRight size={14} aria-hidden />
          </span>
          <Link href={`/folders/${f.id}`}>
            <Folder size={14} aria-hidden />
            {f.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
