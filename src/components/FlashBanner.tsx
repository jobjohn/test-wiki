"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Flash } from "@/lib/flash";

const clearCookie = () => {
  document.cookie = "wiki_flash=; Max-Age=0; path=/; SameSite=Lax";
};

/** 直前の操作の結果メッセージ（1 回だけ表示し、別の画面へ移動すると消える） */
export function FlashBanner({ flash }: { flash: Flash | null }) {
  const pathname = usePathname();
  const [shown, setShown] = useState<Flash | null>(flash);
  const handled = useRef<string | null>(flash?.id ?? null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setShown(null);
    }
    if (flash && flash.id !== handled.current) {
      handled.current = flash.id;
      setShown(flash);
    }
    if (flash) clearCookie();
  }, [pathname, flash]);

  useEffect(() => {
    if (shown?.type !== "notice") return;
    const timer = setTimeout(() => setShown(null), 8000);
    return () => clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;
  return (
    <div className={`flash flash-${shown.type}`} role={shown.type === "alert" ? "alert" : "status"}>
      {shown.type === "notice" ? <Check size={18} aria-hidden /> : <TriangleAlert size={18} aria-hidden />}
      <span>{shown.message}</span>
      <button type="button" className="flash-close" aria-label="閉じる" onClick={() => setShown(null)}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
