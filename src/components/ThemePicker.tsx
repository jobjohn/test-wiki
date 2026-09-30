"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { COLOR_MODES, contrastColor, THEMES, type ColorMode, type ThemeKey } from "@/lib/themes";

const MODE_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const COLOR_FIELDS = [
  { key: "secondary", name: "secondaryColor", label: "ベースカラー" },
  { key: "primary", name: "primaryColor", label: "メインカラー" },
  { key: "accent", name: "accentColor", label: "差し色" },
] as const;

type Colors = { primary: string; secondary: string; accent: string };

/**
 * カラーテーマ（ベース・メイン・差し色の 3 色）の選択。選ぶとすぐこの画面に反映して確認できる
 * （保存するまでは画面上のプレビューのみ）。
 */
export function ThemePicker({
  initialTheme,
  initialColors,
  initialMode,
  showMode = false,
  legend = true,
}: {
  initialTheme: ThemeKey | "custom";
  initialColors: Colors;
  initialMode: ColorMode;
  showMode?: boolean;
  legend?: boolean;
}) {
  const [theme, setTheme] = useState<ThemeKey | "custom">(initialTheme);
  const [colors, setColors] = useState<Colors>(initialColors);
  const [mode, setMode] = useState<ColorMode>(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    for (const { key } of COLOR_FIELDS) {
      root.style.setProperty(`--${key}`, colors[key]);
      root.style.setProperty(`--${key}-fg`, contrastColor(colors[key]));
    }
  }, [colors]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  // 保存せずに画面を離れたら、プレビューを元に戻す
  useEffect(() => {
    const root = document.documentElement;
    return () => {
      for (const { key } of COLOR_FIELDS) {
        root.style.removeProperty(`--${key}`);
        root.style.removeProperty(`--${key}-fg`);
      }
      root.dataset.theme = initialMode;
    };
  }, [initialMode]);

  const choose = (key: ThemeKey | "custom") => {
    setTheme(key);
    if (key !== "custom") setColors({ primary: THEMES[key].primary, secondary: THEMES[key].secondary, accent: THEMES[key].accent });
  };

  return (
    <>
      {/* 送信する値はここで持つ（フォームのリセットでラジオの選択状態が戻ってしまうのを避ける） */}
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="colorMode" value={mode} />
      <fieldset className="field theme-picker">
        {legend && <legend>カラーテーマ</legend>}
        <p className="hint">ベースカラー（ヘッダー・画面の基調）・メインカラー（ボタン・リンク）・差し色（タグ・強調）の 3 色で全体の配色が決まります。</p>
        <div className="theme-options">
          {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, preset]) => (
            <label key={key} className="theme-option">
              <input type="radio" name="themeChoice" value={key} checked={theme === key} onChange={() => choose(key)} />
              <span className="theme-card">
                <span className="swatches">
                  {[preset.secondary, preset.primary, preset.accent].map((color) => (
                    <span key={color} className="swatch" style={{ background: color }} />
                  ))}
                </span>
                <span>{preset.name}</span>
              </span>
            </label>
          ))}
          <label className="theme-option">
            <input type="radio" name="themeChoice" value="custom" checked={theme === "custom"} onChange={() => choose("custom")} />
            <span className="theme-card">
              <Palette size={22} aria-hidden />
              <span>カスタム</span>
            </span>
          </label>
        </div>
        <div className="color-inputs">
          {COLOR_FIELDS.map(({ key, name, label }) => (
            <label key={key} className="color-input">
              <input
                type="color"
                name={name}
                value={colors[key]}
                onChange={(e) => {
                  setTheme("custom");
                  setColors((prev) => ({ ...prev, [key]: e.target.value }));
                }}
              />
              <span>
                {label}
                <br />
                <code>{colors[key]}</code>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {showMode && (
        <fieldset className="field">
          <legend>表示モード</legend>
          <div className="segmented">
            {(Object.keys(COLOR_MODES) as ColorMode[]).map((key) => {
              const Icon = MODE_ICONS[key];
              return (
                <label key={key}>
                  <input type="radio" name="colorModeChoice" value={key} checked={mode === key} onChange={() => setMode(key)} />
                  <span>
                    <Icon size={16} aria-hidden />
                    {COLOR_MODES[key]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}
