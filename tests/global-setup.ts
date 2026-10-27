import fs from "node:fs";
import path from "node:path";

// テスト実行 1 回分のデータ領域の親ディレクトリを作り、終了時にまとめて消す。
// 各テストファイルは tests/setup.ts でこの下に自分専用のディレクトリを作る（環境変数はワーカーに引き継がれる）
export default function setup() {
  const base = path.join(process.cwd(), "node_modules", ".cache");
  fs.mkdirSync(base, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(base, "wiki-test-run-"));
  process.env.WIKI_TEST_RUN_DIR = runDir;
  return () => {
    fs.rmSync(runDir, { recursive: true, force: true });
  };
}
