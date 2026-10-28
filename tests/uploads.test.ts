import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dataDir } from "@/lib/env";
import { createPage } from "@/lib/pages";
import { trashPage } from "@/lib/trash";
import { getUpload, getUploadByAccessKey, listUploads, MAX_UPLOAD_SIZE, storeUpload, storeUploadStream, uploadMarkdown, uploadPath } from "@/lib/uploads";

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
    expect(listUploads({ limit: 1000 }).uploads.some((u) => u.filename === "a.txt")).toBe(false);
  });

  it("成功したときはファイルと DB の行が対になって残る", async () => {
    const upload = await storeUpload(new File(["data"], "b.txt", { type: "text/plain" }), null);
    expect(filesIn()).toContain(upload.storageKey);
  });
});

const streamOf = (...chunks: (string | Uint8Array)[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
      controller.close();
    },
  });

describe("本文を流し込む保存", () => {
  it("いくつかに分かれて届いたデータをつなげて保存し、実際のサイズを記録する", async () => {
    const upload = await storeUploadStream({ stream: streamOf("ab", "cd", "e"), filename: "s.txt", contentType: "text/plain", expectedSize: 5 }, null);
    expect(upload.byteSize).toBe(5);
    expect(fs.readFileSync(path.join(dataDir(), "files", upload.storageKey), "utf8")).toBe("abcde");
  });

  it("ファイル名の区切り文字・制御文字を置き換え、空なら file にする", async () => {
    expect((await storeUploadStream({ stream: streamOf("x"), filename: "../a/b\u0001.txt", contentType: "" }, null)).filename).toBe(".._a_b_.txt");
    const unnamed = await storeUploadStream({ stream: streamOf("x"), filename: "", contentType: "" }, null);
    expect(unnamed.filename).toBe("file");
    expect(unnamed.contentType).toBe("application/octet-stream");
  });

  it("上限を超えたら途中で止めて、書きかけのファイルも行も残さない", async () => {
    const before = filesIn();
    const big = new Uint8Array(1024 * 1024);
    const chunks = Array.from({ length: MAX_UPLOAD_SIZE / big.length + 1 }, () => big);
    await expect(storeUploadStream({ stream: streamOf(...chunks), filename: "big.bin", contentType: "" }, null)).rejects.toThrow(/MB 以下/);
    expect(filesIn()).toEqual(before);
  });

  it("Content-Length より短く切れていたら保存しない（途中で切れたファイルを残さない）", async () => {
    const before = filesIn();
    await expect(storeUploadStream({ stream: streamOf("abc"), filename: "cut.txt", contentType: "", expectedSize: 10 }, null)).rejects.toThrow(/最後まで/);
    expect(filesIn()).toEqual(before);
  });

  it("中身が空なら保存しない", async () => {
    await expect(storeUploadStream({ stream: streamOf(), filename: "empty.txt", contentType: "" }, null)).rejects.toThrow(/選択/);
  });
});

describe("ファイル一覧", () => {
  it("ページ・リンク集・ゴミ箱のどこからも参照されていないものだけを絞り込める", async () => {
    const used = await storeUpload(new File(["u"], "used.txt", { type: "text/plain" }), null);
    const unused = await storeUpload(new File(["n"], "unused.txt", { type: "text/plain" }), null);
    const trashed = await storeUpload(new File(["t"], "trashed.txt", { type: "text/plain" }), null);
    createPage({ title: "ファイルを使うページ", body: `[x](${uploadPath(used)})`, folderId: null, position: 0, tags: "", userId: null });
    const gone = createPage({ title: "ゴミ箱に入れるページ", body: `![t](${uploadPath(trashed)})`, folderId: null, position: 0, tags: "", userId: null });
    trashPage(gone, null);

    const ids = (filter: "all" | "unreferenced") => listUploads({ filter, limit: 1000 }).uploads.map((u) => u.id);
    expect(ids("all")).toEqual(expect.arrayContaining([used.id, unused.id, trashed.id]));
    expect(ids("unreferenced")).toContain(unused.id);
    expect(ids("unreferenced")).not.toContain(used.id);
    expect(ids("unreferenced")).not.toContain(trashed.id);
    const all = listUploads({ limit: 1000 }).uploads;
    expect(all.find((u) => u.id === used.id)?.referenced).toBe(true);
    expect(all.find((u) => u.id === unused.id)?.referenced).toBe(false);
  });

  it("番号の前方一致を参照と取り違えない（/files/1/ と /files/12/）", async () => {
    let a = await storeUpload(new File(["a"], "a.txt", { type: "text/plain" }), null);
    // a の番号を頭に含む、より大きな番号のファイルができるまで足す
    let b = await storeUpload(new File(["b"], "b.txt", { type: "text/plain" }), null);
    while (!String(b.id).startsWith(String(a.id)) || b.id === a.id) {
      if (String(b.id).length > String(a.id).length + 1) a = b;
      b = await storeUpload(new File(["b"], "b.txt", { type: "text/plain" }), null);
    }
    createPage({ title: `長い番号だけを参照 ${b.id}`, body: `[b](/files/${b.id}/b.txt)`, folderId: null, position: 0, tags: "", userId: null });
    const unreferenced = listUploads({ filter: "unreferenced", limit: 1000 }).uploads.map((u) => u.id);
    expect(unreferenced).toContain(a.id);
    expect(unreferenced).not.toContain(b.id);
  });

  it("件数と、ページ分けした結果を返す", async () => {
    const { total } = listUploads();
    const first = listUploads({ limit: 2, offset: 0 }).uploads;
    const second = listUploads({ limit: 2, offset: 2 }).uploads;
    expect(total).toBeGreaterThan(4);
    expect(first).toHaveLength(2);
    expect(second.map((u) => u.id)).not.toEqual(expect.arrayContaining(first.map((u) => u.id)));
  });
});

describe("ファイルの URL", () => {
  it("新しいファイルには推測できない鍵が付き、リンクは鍵の形になる", async () => {
    const a = await storeUpload(new File(["a"], "画像 1.png", { type: "image/png" }), null);
    const b = await storeUpload(new File(["b"], "b.txt", { type: "text/plain" }), null);
    expect(a.accessKey).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(a.accessKey).not.toBe(b.accessKey);
    expect(uploadPath(a)).toBe(`/files/k/${a.accessKey}/${encodeURIComponent("画像 1.png")}`);
    expect(uploadMarkdown(a)).toBe(`![画像 1.png](${uploadPath(a)})`);
    expect(getUploadByAccessKey(a.accessKey!)?.id).toBe(a.id);
  });

  it("鍵として形の合わない値・存在しない鍵では見つからない", () => {
    expect(getUploadByAccessKey("1")).toBeUndefined();
    expect(getUploadByAccessKey("../../etc/passwd")).toBeUndefined();
    expect(getUploadByAccessKey("A".repeat(24))).toBeUndefined();
  });

  it("鍵がない（移行前の）ファイルは、番号の URL を使う", async () => {
    const upload = await storeUpload(new File(["c"], "c.txt", { type: "text/plain" }), null);
    expect(uploadPath({ ...upload, accessKey: null })).toBe(`/files/${upload.id}/c.txt`);
    expect(getUpload(upload.id)?.accessKey).toBe(upload.accessKey);
  });

  it("古い番号の URL で貼られたリンクも参照として数える", async () => {
    const upload = await storeUpload(new File(["d"], "d.txt", { type: "text/plain" }), null);
    createPage({ title: "番号の URL を使うページ", body: `[d](/files/${upload.id}/d.txt)`, folderId: null, position: 0, tags: "", userId: null });
    expect(listUploads({ filter: "unreferenced", limit: 1000 }).uploads.map((u) => u.id)).not.toContain(upload.id);
  });
});
