import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dataDir } from "@/lib/env";
import { listUploads, storeUpload } from "@/lib/uploads";

const filesIn = () => {
  const dir = path.join(dataDir(), "files");
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

describe("アップロードの保存", () => {
  it("DB への登録に失敗したら、書き込んだファイルを消す", async () => {
    const before = filesIn();
    // 存在しないユーザー ID は外部キー制約で INSERT が失敗する
    await expect(storeUpload(new File(["data"], "a.txt", { type: "text/plain" }), 999999)).rejects.toThrow(/FOREIGN KEY/);
    expect(filesIn()).toEqual(before);
    expect(listUploads().some((u) => u.filename === "a.txt")).toBe(false);
  });

  it("成功したときはファイルと DB の行が対になって残る", async () => {
    const upload = await storeUpload(new File(["data"], "b.txt", { type: "text/plain" }), null);
    expect(filesIn()).toContain(upload.storageKey);
  });
});
