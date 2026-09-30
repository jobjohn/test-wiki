/** 連続する空白（全角含む）を 1 つにして前後を除く */
export function squish(value: string): string {
  return value.replace(/[\s　]+/g, " ").trim();
}

/** 大文字小文字・全角半角を区別しない比較用のキー */
export function keyOf(value: string): string {
  return squish(value).normalize("NFKC").toLowerCase();
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function normalizeBody(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function now(): string {
  return new Date().toISOString();
}

/** カンマ・読点・空白区切りのタグ入力を分解する */
export function parseTagList(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(/[,、，\s　]+/)) {
    const name = raw.replace(/\//g, "").trim().slice(0, 50);
    const key = keyOf(name);
    if (name && !seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }
  return result;
}
