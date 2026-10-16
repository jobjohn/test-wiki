import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = path.join(process.cwd(), "src/components");

/** ストーリーを持たない部品と、その理由。新しい部品は、ここに足すのではなくストーリーを書く */
const EXEMPT: Record<string, string> = {
  "ActionForm.tsx": "見た目を持たない仕組み（フォームの送信処理）。各フォームのストーリーの中で使われている",
};

function componentFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(full);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".stories.tsx") ? [full] : [];
  });
}

describe("Storybook への登録", () => {
  const files = componentFiles(COMPONENTS_DIR).map((f) => path.relative(COMPONENTS_DIR, f));

  it("src/components の部品が見つかる", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files.filter((f) => !(f in EXEMPT)))("%s にストーリーがある", (file) => {
    const story = path.join(COMPONENTS_DIR, file.replace(/\.tsx$/, ".stories.tsx"));
    expect(fs.existsSync(story), `${file} と同じ場所に ${path.basename(story)} を作ってください`).toBe(true);
  });

  it("ストーリーを免除した部品が、まだ存在する（不要になった免除を残さない）", () => {
    for (const file of Object.keys(EXEMPT)) expect(files).toContain(file);
  });
});
