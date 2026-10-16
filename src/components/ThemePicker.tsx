"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

      <FieldSet>
        <FieldLegend variant="label">カラーテーマ</FieldLegend>
        <FieldDescription>
          ベースカラー（サイドバー）・メインカラー（ボタン・リンク）・差し色（タグ・強調）の 3 色で全体の配色が決まります。
        </FieldDescription>
        <RadioGroup value={theme} onValueChange={choose} aria-label="カラーテーマ" className="grid-cols-2 sm:grid-cols-4">
          {[
            ...(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, preset]) => ({
              key,
              name: preset.name,
              swatches: [preset.secondary, preset.primary, preset.accent],
            })),
            { key: "custom", name: "カスタム", swatches: null },
          ].map(({ key, name, swatches }) => (
            <FieldLabel key={key} htmlFor={`theme-${key}`}>
              <Field orientation="horizontal">
                <FieldContent className="items-center gap-2">
                  {swatches ? (
                    <span className="flex">
                      {swatches.map((color, i) => (
                        <span
                          key={i}
                          className={cn("size-6 rounded-full border-2 border-background ring-1 ring-border", i > 0 && "-ml-1.5")}
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                  ) : (
                    <Palette className="size-6 text-muted-foreground" aria-hidden />
                  )}
                  <FieldTitle>{name}</FieldTitle>
                </FieldContent>
                <RadioGroupItem value={key} id={`theme-${key}`} aria-label={name} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>

        <div className="flex flex-wrap gap-4">
          {COLOR_FIELDS.map(({ key, name, label }) => (
            <Field key={key} orientation="horizontal" className="w-auto">
              <Input
                type="color"
                id={name}
                name={name}
                value={colors[key]}
                onChange={(e) => {
                  setTheme("custom");
                  setColors((prev) => ({ ...prev, [key]: e.target.value }));
                }}
                className="h-9 w-12 cursor-pointer p-1"
              />
              <FieldContent className="gap-0">
                <FieldLabel htmlFor={name}>{label}</FieldLabel>
                <FieldDescription>{colors[key]}</FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </div>
      </FieldSet>

      {showMode && (
        <FieldSet>
          <FieldLegend variant="label">表示モード</FieldLegend>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ColorMode)} aria-label="表示モード" className="flex flex-wrap">
            {(Object.keys(COLOR_MODES) as ColorMode[]).map((key) => {
              const Icon = MODE_ICONS[key];
              return (
                <FieldLabel key={key} htmlFor={`mode-${key}`} className="w-auto!">
                  <Field orientation="horizontal">
                    <RadioGroupItem value={key} id={`mode-${key}`} aria-label={COLOR_MODES[key]} />
                    <FieldTitle>
                      <Icon className="size-4" aria-hidden />
                      {COLOR_MODES[key]}
                    </FieldTitle>
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </FieldSet>
      )}
    </div>
  );
}
