"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Flash } from "@/lib/flash";

/** 直前の操作の結果を、トースト通知（sonner）で 1 回だけ表示する */
export function FlashBanner({ flash }: { flash: Flash | null }) {
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!flash || shown.current === flash.id) return;
    shown.current = flash.id;
    document.cookie = "wiki_flash=; Max-Age=0; path=/; SameSite=Lax";
    if (flash.type === "notice") toast.success(flash.message, { duration: 6000 });
    else toast.error(flash.message, { duration: 10000 });
  }, [flash]);

  return null;
}
