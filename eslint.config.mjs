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
      // ダークモードで選択肢が白く残らないよう、NativeSelect の中では色を付けた部品を使う
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement[openingElement.name.name='NativeSelect'] JSXOpeningElement[name.name='option']",
          message: "NativeSelect の中では <option> ではなく NativeSelectOption を使ってください（ダークモードで白く見えるため）",
        },
        {
          selector: "JSXElement[openingElement.name.name='NativeSelect'] JSXOpeningElement[name.name='optgroup']",
          message: "NativeSelect の中では <optgroup> ではなく NativeSelectOptGroup を使ってください（ダークモードで白く見えるため）",
        },
      ],
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
