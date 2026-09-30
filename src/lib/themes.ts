/** テーマの定義と色の計算（サーバー・ブラウザの両方から使う純粋な処理） */

export const COLOR_MODES = { system: "システムに合わせる", light: "ライト", dark: "ダーク" } as const;
export type ColorMode = keyof typeof COLOR_MODES;

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/**
 * 基本 3 色のプリセット
 *   secondary: ベースカラー（ヘッダー・画面の基調色）
 *   primary:   メインカラー（ボタン・リンク・選択中の項目）
 *   accent:    差し色（タグ・強調・フォルダアイコン）
 */
export const THEMES = {
  standard: { name: "スタンダード", primary: "#2563eb", secondary: "#ffffff", accent: "#16a34a" },
  ocean: { name: "オーシャン", primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b" },
  forest: { name: "フォレスト", primary: "#15803d", secondary: "#14281d", accent: "#eab308" },
  sunset: { name: "サンセット", primary: "#ea580c", secondary: "#2b1d16", accent: "#0ea5e9" },
  grape: { name: "グレープ", primary: "#7c3aed", secondary: "#1e1b2e", accent: "#ec4899" },
  sakura: { name: "さくら", primary: "#db2777", secondary: "#fce7f3", accent: "#0d9488" },
  mono: { name: "モノクロ", primary: "#374151", secondary: "#111827", accent: "#dc2626" },
} as const;
export type ThemeKey = keyof typeof THEMES;

export function currentThemeKey(settings: ThemeColors): ThemeKey | "custom" {
  const match = (Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).find(
    ([, t]) =>
      t.primary === settings.primaryColor && t.secondary === settings.secondaryColor && t.accent === settings.accentColor,
  );
  return match ? match[0] : "custom";
}

/** 背景色の上に置く文字色（白 or 黒）。WCAG の相対輝度で判定 */
export function contrastColor(hex: string): string {
  const channels = hex.replace("#", "").match(/../g)?.map((c) => parseInt(c, 16) / 255);
  if (!channels || channels.length !== 3) return "#ffffff";
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111827" : "#ffffff";
}

export function cssVariables(settings: ThemeColors): string {
  const pairs: [string, string][] = [
    ["primary", settings.primaryColor],
    ["secondary", settings.secondaryColor],
    ["accent", settings.accentColor],
  ];
  return pairs.map(([name, value]) => `--${name}: ${value}; --${name}-fg: ${contrastColor(value)};`).join(" ");
}
