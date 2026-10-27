import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRange, uploadResponse } from "@/lib/file-response";
import { storeUpload, uploadFilePath } from "@/lib/uploads";

const store = (body: string, name: string, type: string) => storeUpload(new File([body], name, { type }), null);

describe("Range ヘッダーの解釈", () => {
  it("単一範囲・開始のみ・末尾 N バイトを解釈する", () => {
    expect(parseRange("bytes=0-3", 10)).toEqual({ start: 0, end: 3 });
    expect(parseRange("bytes=4-", 10)).toEqual({ start: 4, end: 9 });
    expect(parseRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseRange("bytes=-30", 10)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=5-100", 10)).toEqual({ start: 5, end: 9 });
  });

  it("解釈できない・複数範囲は null（全体を返す）", () => {
    expect(parseRange(null, 10)).toBeNull();
    expect(parseRange("bytes=-", 10)).toBeNull();
    expect(parseRange("bytes=0-1,3-4", 10)).toBeNull();
    expect(parseRange("items=0-1", 10)).toBeNull();
    expect(parseRange("bytes=5-2", 10)).toBeNull();
  });

  it("ファイルの外を指す範囲は unsatisfiable", () => {
    expect(parseRange("bytes=10-", 10)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 10)).toBe("unsatisfiable");
  });
});

describe("アップロードファイルの配信", () => {
  it("全体をストリームで返し、安全のためのヘッダーを付ける", async () => {
    const upload = await store("hello world", "メモ.txt", "text/plain");
    const res = uploadResponse(upload);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello world");
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(res.headers.get("content-length")).toBe("11");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-disposition")).toBe(`inline; filename*=UTF-8''${encodeURIComponent("メモ.txt")}`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
  });

  it("Range を指定すると 206 で一部だけ返す", async () => {
    const upload = await store("0123456789", "clip.mp4", "video/mp4");
    const res = uploadResponse(upload, "bytes=2-5");
    expect(res.status).toBe(206);
    expect(await res.text()).toBe("2345");
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(res.headers.get("content-length")).toBe("4");

    const tail = uploadResponse(upload, "bytes=-3");
    expect(tail.status).toBe(206);
    expect(await tail.text()).toBe("789");
  });

  it("範囲がファイルの外なら 416", async () => {
    const upload = await store("0123456789", "song.mp3", "audio/mpeg");
    const res = uploadResponse(upload, "bytes=20-");
    expect(res.status).toBe(416);
    expect(res.headers.get("content-range")).toBe("bytes */10");
  });

  it("スクリプトが動き得る種類はダウンロードさせ、PDF は sandbox を付けない", async () => {
    const svg = uploadResponse(await store("<svg/>", "x.svg", "image/svg+xml"));
    expect(svg.headers.get("content-type")).toBe("application/octet-stream");
    expect(svg.headers.get("content-disposition")).toMatch(/^attachment;/);
    await svg.body?.cancel();

    const pdf = uploadResponse(await store("%PDF-1.4", "a.pdf", "application/pdf"));
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-security-policy")).toBeNull();
    await pdf.body?.cancel();
  });

  it("実ファイルがなければ 404", async () => {
    const upload = await store("gone", "gone.txt", "text/plain");
    fs.rmSync(uploadFilePath(upload));
    expect(uploadResponse(upload).status).toBe(404);
  });
});
