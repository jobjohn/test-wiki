import { Folder, House } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ancestorsOf, type Folder as FolderType } from "@/lib/folders";

/** ホーム > 親フォルダ > … のパンくずリスト（includeSelf でそのフォルダ自身も含める） */
export function FolderBreadcrumbs({ folder, includeSelf = true }: { folder: FolderType; includeSelf?: boolean }) {
  const chain = includeSelf ? [...ancestorsOf(folder), folder] : ancestorsOf(folder);
  return (
    <Breadcrumb className="mb-1">
      <BreadcrumbList className="gap-1 sm:gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" title="ホーム" aria-label="ホーム">
              <House className="size-3.5" aria-hidden />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {chain.map((f) => (
          <Fragment key={f.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/folders/${f.id}`}>
                  <Folder className="size-3.5" aria-hidden />
                  {f.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** 任意のパンくず（リンクと現在地の並び） */
export function SimpleBreadcrumb({ items }: { items: { href: string; label: string; icon?: React.ReactNode }[] }) {
  return (
    <Breadcrumb className="mb-1">
      <BreadcrumbList className="gap-1 sm:gap-1.5">
        {items.map((item, i) => (
          <Fragment key={item.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={item.href}>
                  {item.icon}
                  {item.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
