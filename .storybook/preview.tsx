import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@fontsource-variable/noto-sans-jp";
import "../src/app/globals.css";

const withAppContext: Decorator = (Story) => (
  <TooltipProvider>
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
