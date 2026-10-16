// Storybook 用: src/lib/folders.ts の代わり。データベースを読む関数だけを、固定のサンプルデータで置き換える。
export type { Folder } from "../../src/lib/folders";

/** 「開発 > API」の下にあるフォルダとして扱う */
export function ancestorsOf() {
  return [
    { id: 1, name: "開発", parentId: null, position: 0 },
    { id: 2, name: "API", parentId: 1, position: 0 },
  ];
}
