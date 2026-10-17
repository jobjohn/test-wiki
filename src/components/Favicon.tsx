"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** リンクのファビコン（登録時に保存した画像）。ないとき・表示できないときは汎用のリンクアイコン */
export function Favicon({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Link2 className={cn("size-4 text-muted-foreground", className)} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={16} height={16} className={cn("size-4", className)} onError={() => setFailed(true)} />;
}
