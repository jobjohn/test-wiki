import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 推奨（Core Web Vitals・React・React Hooks・jsx-a11y の一部）と typescript-eslint の推奨ルール
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 「{ id: _id, ...rest }」のように、残りのプロパティを取り出すために捨てる変数は未使用扱いしない
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "storage/**",
    "data/**",
    "storybook-static/**",
    "storybook-shots/**",
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    ".claude/**",
    "next-env.d.ts",
  ]),
]);
