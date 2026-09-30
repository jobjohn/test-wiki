import { get, run } from "./db";
import { ValidationError } from "./errors";
import { squish } from "./text";
import { COLOR_MODES, THEMES, type ColorMode, type ThemeKey } from "./themes";

export { COLOR_MODES, THEMES, contrastColor, cssVariables, currentThemeKey } from "./themes";
export type { ColorMode, ThemeKey } from "./themes";

const COLOR_FORMAT = /^#[0-9a-f]{6}$/;

export interface Settings {
  wikiName: string;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  colorMode: ColorMode;
  publicRead: boolean;
  requireMfa: boolean;
  setupCompletedAt: string | null;
}

interface SettingsRow {
  wiki_name: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  color_mode: ColorMode;
  public_read: number;
  require_mfa: number;
  setup_completed_at: string | null;
}

export function getSettings(): Settings {
  const row = get<SettingsRow>("SELECT * FROM settings WHERE id = 1");
  if (!row) throw new Error("settings row is missing");
  return {
    wikiName: row.wiki_name,
    description: row.description,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    colorMode: row.color_mode,
    publicRead: !!row.public_read,
    requireMfa: !!row.require_mfa,
    setupCompletedAt: row.setup_completed_at,
  };
}

export interface SettingsInput {
  wikiName: string;
  description: string;
  theme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  colorMode?: string;
  publicRead?: boolean;
  requireMfa?: boolean;
}

/** 入力を検証して保存する。theme にプリセット名があれば 3 色をそれで置き換える */
export function updateSettings(input: SettingsInput, options: { completeSetup?: boolean } = {}): Settings {
  const current = getSettings();
  const errors: string[] = [];

  const wikiName = squish(input.wikiName);
  if (!wikiName) errors.push("Wiki の名前を入力してください");
  if (wikiName.length > 50) errors.push("Wiki の名前は 50 文字以内にしてください");

  const description = input.description.replace(/\r\n?/g, "\n").trim();
  if (description.length > 2000) errors.push("Wiki の説明は 2000 文字以内にしてください");

  let colors = {
    primary: (input.primaryColor ?? current.primaryColor).trim().toLowerCase(),
    secondary: (input.secondaryColor ?? current.secondaryColor).trim().toLowerCase(),
    accent: (input.accentColor ?? current.accentColor).trim().toLowerCase(),
  };
  const preset = input.theme && input.theme !== "custom" ? THEMES[input.theme as ThemeKey] : undefined;
  if (preset) colors = { primary: preset.primary, secondary: preset.secondary, accent: preset.accent };
  for (const [label, value] of [
    ["メインカラー", colors.primary],
    ["ベースカラー", colors.secondary],
    ["差し色", colors.accent],
  ]) {
    if (!COLOR_FORMAT.test(value)) errors.push(`${label}は #rrggbb 形式で指定してください`);
  }

  const colorMode = (input.colorMode ?? current.colorMode) as ColorMode;
  if (!(colorMode in COLOR_MODES)) errors.push("表示モードが不正です");

  if (errors.length) throw new ValidationError(errors);

  run(
    `UPDATE settings SET wiki_name = ?, description = ?, primary_color = ?, secondary_color = ?, accent_color = ?,
       color_mode = ?, public_read = ?, require_mfa = ?, setup_completed_at = ? WHERE id = 1`,
    wikiName,
    description || null,
    colors.primary,
    colors.secondary,
    colors.accent,
    colorMode,
    (input.publicRead ?? current.publicRead) ? 1 : 0,
    (input.requireMfa ?? current.requireMfa) ? 1 : 0,
    options.completeSetup ? new Date().toISOString() : current.setupCompletedAt,
  );
  return getSettings();
}
