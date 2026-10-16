import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { contrastColor, THEME_VARIABLES, THEMES, type ThemeKey } from "@/lib/themes";
import "../src/app/globals.css";

/** ツールバーで選んだカラーテーマ（ベース・メイン・差し色の 3 色）を、アプリ本体と同じ CSS 変数として適用する */
function PaletteVariables({ palette }: { palette: ThemeKey }) {
  useLayoutEffect(() => {
    const preset = THEMES[palette];
    const colors = { primaryColor: preset.primary, secondaryColor: preset.secondary, accentColor: preset.accent };
    const root = document.documentElement;
    for (const { name, key } of THEME_VARIABLES) {
      root.style.setProperty(`--${name}`, colors[key]);
      root.style.setProperty(`--${name}-foreground`, contrastColor(colors[key]));
    }
  }, [palette]);
  return null;
}

const withAppContext: Decorator = (Story, context) => (
  <TooltipProvider>
    <PaletteVariables palette={(context.globals.palette as ThemeKey) ?? "standard"} />
    <Story />
    <Toaster position="bottom-right" closeButton />
  </TooltipProvider>
);

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      // 名前は URL（?globals=theme:dark）で指定できるよう、半角英字にしている
      themes: { light: "light", dark: "dark", system: "system" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    withAppContext,
  ],
  globalTypes: {
    palette: {
      description: "カラーテーマ（ベース・メイン・差し色）",
      toolbar: {
        title: "カラーテーマ",
        icon: "paintbrush",
        dynamicTitle: true,
        items: (Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([value, theme]) => ({ value, title: theme.name })),
      },
    },
  },
  initialGlobals: { palette: "standard" },
  parameters: {
    layout: "padded",
    backgrounds: { disabled: true },
    // このアプリは App Router。usePathname / useRouter などを使う部品のために、App Router 用のナビゲーションを有効にする
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // 現時点では、アクセシビリティ違反を一覧表示するだけで、失敗にはしない（統一計画の中で順に解消する）
    a11y: { test: "todo" },
    options: { storySort: { order: ["はじめに", "Foundations", "UI", "Components", "Layout"] } },
  },
};

export default preview;
