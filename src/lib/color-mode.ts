/** 表示モード（ライト / ダーク / システムに合わせる） */
export const COLOR_MODES = { system: "システムに合わせる", light: "ライト", dark: "ダーク" } as const;
export type ColorMode = keyof typeof COLOR_MODES;
