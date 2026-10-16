import { all, get, run, transaction } from "./db";
import { ValidationError } from "./errors";
import { keyOf, now, squish } from "./text";

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  position: number;
}

interface FolderRow {
  id: number;
  name: string;
  parent_id: number | null;
  position: number;
}

const mapFolder = (row: FolderRow): Folder => ({ id: row.id, name: row.name, parentId: row.parent_id, position: row.position });

export const getFolder = (id: number): Folder | undefined => {
  const row = get<FolderRow>("SELECT * FROM folders WHERE id = ?", id);
  return row && mapFolder(row);
};

export const listFolders = (): Folder[] =>
  all<FolderRow>("SELECT * FROM folders ORDER BY position, name_key").map(mapFolder);

export const listChildFolders = (parentId: number | null): Folder[] =>
  all<FolderRow>(
    parentId === null
      ? "SELECT * FROM folders WHERE parent_id IS NULL ORDER BY position, name_key"
      : "SELECT * FROM folders WHERE parent_id = ? ORDER BY position, name_key",
    ...(parentId === null ? [] : [parentId]),
  ).map(mapFolder);

/** ルートから自分の 1 つ上までのフォルダ */
export function ancestorsOf(folder: Folder, folders: Folder[] = listFolders()): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: Folder[] = [];
  const seen = new Set<number>([folder.id]);
  let node = folder.parentId ? byId.get(folder.parentId) : undefined;
  while (node && !seen.has(node.id)) {
    chain.unshift(node);
    seen.add(node.id);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return chain;
}

export function selfAndDescendantIds(id: number, folders: Folder[] = listFolders()): number[] {
  const children = new Map<number, number[]>();
  for (const f of folders) if (f.parentId !== null) children.set(f.parentId, [...(children.get(f.parentId) ?? []), f.id]);
  const ids: number[] = [];
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    if (ids.includes(current)) continue;
    ids.push(current);
    queue.push(...(children.get(current) ?? []));
  }
  return ids;
}

export interface FolderOption {
  id: number;
  label: string;
}

/** 「親 / 子」形式のラベル付きで、階層順に並べた全フォルダ */
export function folderOptions(exclude: number[] = [], folders: Folder[] = listFolders()): FolderOption[] {
  const byParent = new Map<number | null, Folder[]>();
  for (const f of folders) byParent.set(f.parentId, [...(byParent.get(f.parentId) ?? []), f]);
  const result: FolderOption[] = [];
  const walk = (parentId: number | null, prefix: string | null, seen: number[]) => {
    for (const f of byParent.get(parentId) ?? []) {
      if (seen.includes(f.id)) continue;
      const label = prefix ? `${prefix} / ${f.name}` : f.name;
      if (!exclude.includes(f.id)) result.push({ id: f.id, label });
      walk(f.id, label, [...seen, f.id]);
    }
  };
  walk(null, null, []);
  return result;
}

export function folderPathName(folder: Folder): string {
  return [...ancestorsOf(folder), folder].map((f) => f.name).join(" / ");
}

interface FolderInput {
  name: string;
  parentId: number | null;
  position: number;
}

function validate(input: FolderInput, id?: number) {
  const errors: string[] = [];
  const name = squish(input.name);
  if (!name) errors.push("フォルダ名を入力してください");
  if (name.length > 100) errors.push("フォルダ名は 100 文字以内にしてください");

  if (input.parentId !== null) {
    if (!getFolder(input.parentId)) errors.push("親フォルダが存在しません");
    else if (id !== undefined && selfAndDescendantIds(id).includes(input.parentId)) {
      errors.push("親フォルダに自分自身またはサブフォルダは指定できません");
    }
  }
  if (name) {
    const clash = get<{ id: number }>("SELECT id FROM folders WHERE COALESCE(parent_id, 0) = ? AND name_key = ?", input.parentId ?? 0, keyOf(name));
    if (clash && clash.id !== id) errors.push("フォルダ名は同じ場所に既に存在します");
  }
  if (!Number.isInteger(input.position)) errors.push("表示順は整数で指定してください");
  if (errors.length) throw new ValidationError(errors);
  return name;
}

export function createFolder(input: FolderInput): number {
  const name = validate(input);
  const timestamp = now();
  return run(
    "INSERT INTO folders (name, name_key, parent_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    name,
    keyOf(name),
    input.parentId,
    input.position,
    timestamp,
    timestamp,
  ).lastInsertRowid;
}

export function updateFolder(id: number, input: FolderInput) {
  const name = validate(input, id);
  run(
    "UPDATE folders SET name = ?, name_key = ?, parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
    name,
    keyOf(name),
    input.parentId,
    input.position,
    now(),
    id,
  );
}

/** フォルダを削除し、中のページとサブフォルダは 1 つ上の階層へ移す。移動先の名前が重複する場合は失敗する */
export function dissolveFolder(id: number) {
  const folder = getFolder(id);
  if (!folder) return;
  transaction(() => {
    for (const child of listChildFolders(id)) {
      const clash = get<{ id: number }>(
        "SELECT id FROM folders WHERE COALESCE(parent_id, 0) = ? AND name_key = ?",
        folder.parentId ?? 0,
        keyOf(child.name),
      );
      if (clash) throw new ValidationError(`移動先に同名のフォルダ「${child.name}」があるため削除できません`);
      run("UPDATE folders SET parent_id = ? WHERE id = ?", folder.parentId, child.id);
    }
    run("UPDATE pages SET folder_id = ? WHERE folder_id = ?", folder.parentId, id);
    run("DELETE FROM folders WHERE id = ?", id);
  });
}

export function folderCounts(id: number): { folders: number; pages: number } {
  return {
    folders: get<{ n: number }>("SELECT COUNT(*) AS n FROM folders WHERE parent_id = ?", id)!.n,
    pages: get<{ n: number }>("SELECT COUNT(*) AS n FROM pages WHERE folder_id = ?", id)!.n,
  };
}
