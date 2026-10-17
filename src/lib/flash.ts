import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { safeNext } from "./access";

export interface Flash {
  id: string;
  type: "notice" | "alert";
  message: string;
  /** メッセージに添える、サイト内の画面へのリンク（例: 復元したページを開く） */
  link?: { href: string; label: string };
}

const COOKIE = "wiki_flash";

/** 次に表示する画面に出す 1 回限りのメッセージを保存する（サーバーアクション / Route Handler 内で使用） */
export async function setFlash(type: Flash["type"], message: string, link?: Flash["link"]) {
  const value: Flash = { id: randomUUID(), type, message, ...(link ? { link } : {}) };
  (await cookies()).set(COOKIE, encodeURIComponent(JSON.stringify(value)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

/** Cookie の中身を検証して Flash にする。Cookie は利用者が書き換えられるため、形とリンク先を確かめる */
export function parseFlash(raw: string): Flash | null {
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Flash> | null;
    if (!value || typeof value !== "object") return null;
    if (value.type !== "notice" && value.type !== "alert") return null;
    if (typeof value.id !== "string" || typeof value.message !== "string") return null;
    const link = value.link;
    const href = link && typeof link.href === "string" && typeof link.label === "string" ? safeNext(link.href) : null;
    return { id: value.id, type: value.type, message: value.message, ...(href ? { link: { href, label: link!.label } } : {}) };
  } catch {
    return null;
  }
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? parseFlash(raw) : null;
}
