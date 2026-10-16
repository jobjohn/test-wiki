import { diffArrays } from "diff";

export interface DiffLine {
  action: "+" | "-" | "=";
  oldNumber: number | null;
  newNumber: number | null;
  text: string;
}

export interface LineDiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  changed: boolean;
}

/** 2 つのテキストの行単位の差分 */
export function lineDiff(oldText: string, newText: string): LineDiffResult {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const lines: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;

  for (const part of diffArrays(oldLines, newLines)) {
    for (const text of part.value) {
      if (part.added) lines.push({ action: "+", oldNumber: null, newNumber: newNo++, text });
      else if (part.removed) lines.push({ action: "-", oldNumber: oldNo++, newNumber: null, text });
      else lines.push({ action: "=", oldNumber: oldNo++, newNumber: newNo++, text });
    }
  }
  const additions = lines.filter((l) => l.action === "+").length;
  const deletions = lines.filter((l) => l.action === "-").length;
  return { lines, additions, deletions, changed: additions + deletions > 0 };
}

/** 変更箇所の前後 context 行だけを残し、省略部分は null で表す */
export function hunks(lines: DiffLine[], context = 3): (DiffLine[] | null)[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.action === "=") return;
    for (let j = Math.max(i - context, 0); j <= Math.min(i + context, lines.length - 1); j++) keep[j] = true;
  });

  const result: (DiffLine[] | null)[] = [];
  lines.forEach((line, i) => {
    if (keep[i]) {
      const last = result[result.length - 1];
      if (last) last.push(line);
      else result.push([line]);
    } else if (result.length === 0 || result[result.length - 1] !== null) {
      result.push(null);
    }
  });
  return result;
}
