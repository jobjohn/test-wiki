import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const root = process.cwd();
const mock = (file: string) => path.join(root, ".storybook/mocks", file);

/**
 * Storybook ではデータベースやサーバーアクションを使えないため、
 * 次のモジュールは import 先がどこ（相対パス・別名）でも、モックに差し替える。
 *   - src/actions/*   サーバーアクション（何もせず空の結果を返す）
 *   - src/lib/pages.ts, src/lib/folders.ts   データベースを読む関数（固定のサンプルデータを返す）
 */
const MOCKS = new Map<string, string>([
  [path.join(root, "src/lib/pages.ts"), mock("pages.ts")],
  [path.join(root, "src/lib/folders.ts"), mock("folders.ts")],
]);
const ACTIONS_DIR = path.join(root, "src/actions") + path.sep;

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  typescript: { reactDocgen: "react-docgen-typescript" },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [
      ...(viteConfig.plugins ?? []),
      {
        name: "wiki-storybook-mocks",
        enforce: "pre",
        async resolveId(source, importer, options) {
          if (!importer || source.startsWith("\0") || importer.includes("/.storybook/mocks/")) return null;
          const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
          if (!resolved) return null;
          if (resolved.id.startsWith(ACTIONS_DIR)) return mock("actions.ts");
          return MOCKS.get(resolved.id) ?? null;
        },
      },
      {
        // Next.js 16.4 以降の useRouter は LayoutRouterContext.parentRenderTree.data を読む。
        // Storybook のモックにはまだ含まれていないため、不足分を補う
        name: "wiki-storybook-next-router-patch",
        enforce: "pre",
        transform(code: string, id: string) {
          if (!id.includes("@storybook/nextjs-vite") || !code.includes("parentTree: tree,")) return null;
          return code.replace("parentTree: tree,", "parentTree: tree, parentRenderTree: { data: { bfcacheId: 0 } },");
        },
      },
    ];
    // Radix UI の "use client" 指示子について、バンドル時に大量に出る無害な警告を消す
    viteConfig.build = {
      ...viteConfig.build,
      rolldownOptions: {
        ...(viteConfig.build as { rolldownOptions?: object } | undefined)?.rolldownOptions,
        onwarn(warning: { code?: string }, warn: (w: unknown) => void) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          warn(warning);
        },
      },
    } as typeof viteConfig.build;
    return viteConfig;
  },
};

export default config;
