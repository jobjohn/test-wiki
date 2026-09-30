"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { COLOR_MODES, contrastColor, THEME_VARIABLES, THEMES, type ColorMode, type ThemeKey } from "@/lib/themes";

const MODE_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
type Colors = { primaryColor: string; secondaryColor: string; accentColor: string };
type ColorKey = keyof Colors;

// 入力欄の並び順と表示名
const COLOR_FIELDS: { key: ColorKey; name: string; label: string }[] = [
  { key: "secondaryColor", name: "secondaryColor", label: "ベースカラー" },
  { key: "primaryColor", name: "primaryColor", label: "メインカラー" },
  { key: "accentColor", name: "accentColor", label: "差し色" },
];

const optionClass =
  "relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 pt-6 text-sm transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50";

/**
 * カラーテーマ（ベース・メイン・差し色の 3 色）の選択。選ぶとすぐこの画面に反映して確認できる
 * （保存するまでは画面上のプレビューのみ）。送信する値は隠しフィールドで持つ。
 */
export function ThemePicker({
  initialTheme,
  initialColors,
  initialMode,
  showMode = false,
}: {
  initialTheme: ThemeKey | "custom";
  initialColors: Colors;
  initialMode: ColorMode;
  showMode?: boolean;
}) {
  const [theme, setTheme] = useState<ThemeKey | "custom">(initialTheme);
  const [colors, setColors] = useState<Colors>(initialColors);
  const [mode, setMode] = useState<ColorMode>(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    for (const { name, key } of THEME_VARIABLES) {
      root.style.setProperty(`--${name}`, colors[key]);
      root.style.setProperty(`--${name}-foreground`, contrastColor(colors[key]));
    }
  }, [colors]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  // 保存せずに画面を離れたら、プレビューを元に戻す
  useEffect(() => {
    const root = document.documentElement;
    return () => {
      for (const { name } of THEME_VARIABLES) {
        root.style.removeProperty(`--${name}`);
        root.style.removeProperty(`--${name}-foreground`);
      }
      root.dataset.theme = initialMode;
    };
  }, [initialMode]);

  const choose = (key: string) => {
    setTheme(key as ThemeKey | "custom");
    if (key in THEMES) {
      const preset = THEMES[key as ThemeKey];
      setColors({ primaryColor: preset.primary, secondaryColor: preset.secondary, accentColor: preset.accent });
    }
  };

  return (
    <div className="grid gap-6">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="colorMode" value={mode} />

      <div className="grid gap-3">
        <Label id="theme-label">カラーテーマ</Label>
        <p className="text-sm text-muted-foreground">
          ベースカラー（ヘッダー・画面の基調）・メインカラー（ボタン・リンク）・差し色（タグ・強調）の 3 色で全体の配色が決まります。
        </p>
        <RadioGroup value={theme} onValueChange={choose} aria-labelledby="theme-label" className="grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, preset]) => (
            <Label key={key} className={optionClass}>
              <RadioGroupItem value={key} className="absolute top-2 left-2" aria-label={preset.name} />
              <span className="flex">
                {[preset.secondary, preset.primary, preset.accent].map((color, i) => (
                  <span key={i} className={cn("size-6 rounded-full border-2 border-background ring-1 ring-border", i > 0 && "-ml-1.5")} style={{ background: color }} />
                ))}
              </span>
              <span>{preset.name}</span>
            </Label>
          ))}
          <Label className={optionClass}>
            <RadioGroupItem value="custom" className="absolute top-2 left-2" aria-label="カスタム" />
            <Palette className="size-6 text-muted-foreground" aria-hidden />
            <span>カスタム</span>
          </Label>
        </RadioGroup>

        <div className="flex flex-wrap gap-4">
          {COLOR_FIELDS.map(({ key, name, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm leading-tight">
              <input
                type="color"
                name={name}
                value={colors[key]}
                onChange={(e) => {
                  setTheme("custom");
                  setColors((prev) => ({ ...prev, [key]: e.target.value }));
                }}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <span>
                {label}
                <br />
                <code className="font-mono text-xs text-muted-foreground">{colors[key]}</code>
              </span>
            </label>
          ))}
        </div>
      </div>

      {showMode && (
        <div className="grid gap-3">
          <Label id="mode-label">表示モード</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ColorMode)} aria-labelledby="mode-label" className="flex flex-wrap gap-2">
            {(Object.keys(COLOR_MODES) as ColorMode[]).map((key) => {
              const Icon = MODE_ICONS[key];
              return (
                <Label key={key} className="cursor-pointer gap-2 rounded-md border px-3 py-2 hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50">
                  <RadioGroupItem value={key} aria-label={COLOR_MODES[key]} />
                  <Icon className="size-4" aria-hidden />
                  {COLOR_MODES[key]}
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
