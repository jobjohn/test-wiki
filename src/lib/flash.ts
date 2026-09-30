import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export interface Flash {
  id: string;
  type: "notice" | "alert";
  message: string;
}

const COOKIE = "wiki_flash";

/** 次に表示する画面に出す 1 回限りのメッセージを保存する（サーバーアクション / Route Handler 内で使用） */
export async function setFlash(type: Flash["type"], message: string) {
  const value: Flash = { id: randomUUID(), type, message };
  (await cookies()).set(COOKIE, encodeURIComponent(JSON.stringify(value)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Flash;
    return value && typeof value.message === "string" ? value : null;
  } catch {
    return null;
  }
}
