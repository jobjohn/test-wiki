/** ゴミ箱の保持期間（日）。過ぎたものは自動で完全に削除される */
export const TRASH_RETENTION_DAYS = 30;

export type TrashKind = "page" | "bookmark" | "upload";

export const TRASH_KINDS: readonly TrashKind[] = ["page", "bookmark", "upload"];

export const isTrashKind = (value: string): value is TrashKind => (TRASH_KINDS as readonly string[]).includes(value);

export const TRASH_KIND_LABELS: Record<TrashKind, string> = { page: "ページ", bookmark: "リンク", upload: "ファイル" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** 完全に削除されるまでの残り日数（切り上げ。0 以上） */
export function trashDaysLeft(deletedAt: string, now: Date = new Date()): number {
  const remaining = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY_MS - now.getTime();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
}
