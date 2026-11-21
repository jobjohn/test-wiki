/** ページ編集の未保存内容。サーバーには送らず、ブラウザの localStorage だけに置く */
export interface PageDraft {
  title: string;
  body: string;
  folderId: string;
  position: string;
  tags: string;
  summary: string;
  savedAt: string;
}

export type PageDraftBaseline = Omit<PageDraft, "savedAt" | "summary">;

const PREFIX = "test-wiki:page-draft:";

export function pageDraftKey(pageId: number | null): string {
  return `${PREFIX}${pageId ?? "new"}`;
}

/** 要約も含めて、サーバーから開いた内容と違えば未保存 */
export function isPageDirty(current: Omit<PageDraft, "savedAt">, initial: PageDraftBaseline): boolean {
  return (
    current.title !== initial.title ||
    current.body !== initial.body ||
    current.folderId !== initial.folderId ||
    current.position !== initial.position ||
    current.tags !== initial.tags ||
    current.summary !== ""
  );
}

export function readPageDraft(storage: Storage, pageId: number | null): PageDraft | null {
  const raw = storage.getItem(pageDraftKey(pageId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PageDraft>;
    if (typeof parsed.title !== "string" || typeof parsed.body !== "string") return null;
    return {
      title: parsed.title,
      body: parsed.body,
      folderId: typeof parsed.folderId === "string" ? parsed.folderId : "",
      position: typeof parsed.position === "string" ? parsed.position : "",
      tags: typeof parsed.tags === "string" ? parsed.tags : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}

export function writePageDraft(storage: Storage, pageId: number | null, draft: PageDraft): void {
  storage.setItem(pageDraftKey(pageId), JSON.stringify(draft));
}

export function clearPageDraft(storage: Storage, pageId: number | null): void {
  storage.removeItem(pageDraftKey(pageId));
}
