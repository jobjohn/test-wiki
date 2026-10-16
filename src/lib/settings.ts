import { get, run } from "./db";
import { ValidationError } from "./errors";
import { squish } from "./text";
import { COLOR_MODES, type ColorMode } from "./color-mode";

export { COLOR_MODES } from "./color-mode";
export type { ColorMode } from "./color-mode";

export interface Settings {
  wikiName: string;
  description: string | null;
  colorMode: ColorMode;
  publicRead: boolean;
  requireMfa: boolean;
  setupCompletedAt: string | null;
}

interface SettingsRow {
  wiki_name: string;
  description: string | null;
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
    colorMode: row.color_mode,
    publicRead: !!row.public_read,
    requireMfa: !!row.require_mfa,
    setupCompletedAt: row.setup_completed_at,
  };
}

export interface SettingsInput {
  wikiName: string;
  description: string;
  colorMode?: string;
  publicRead?: boolean;
  requireMfa?: boolean;
}

/** 入力を検証して保存する */
export function updateSettings(input: SettingsInput, options: { completeSetup?: boolean } = {}): Settings {
  const current = getSettings();
  const errors: string[] = [];

  const wikiName = squish(input.wikiName);
  if (!wikiName) errors.push("Wiki の名前を入力してください");
  if (wikiName.length > 50) errors.push("Wiki の名前は 50 文字以内にしてください");

  const description = input.description.replace(/\r\n?/g, "\n").trim();
  if (description.length > 2000) errors.push("Wiki の説明は 2000 文字以内にしてください");

  const colorMode = (input.colorMode ?? current.colorMode) as ColorMode;
  if (!(colorMode in COLOR_MODES)) errors.push("表示モードが不正です");

  if (errors.length) throw new ValidationError(errors);

  run(
    "UPDATE settings SET wiki_name = ?, description = ?, color_mode = ?, public_read = ?, require_mfa = ?, setup_completed_at = ? WHERE id = 1",
    wikiName,
    description || null,
    colorMode,
    (input.publicRead ?? current.publicRead) ? 1 : 0,
    (input.requireMfa ?? current.requireMfa) ? 1 : 0,
    options.completeSetup ? new Date().toISOString() : current.setupCompletedAt,
  );
  return getSettings();
}
