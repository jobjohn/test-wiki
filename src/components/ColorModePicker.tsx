"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COLOR_MODES, type ColorMode } from "@/lib/color-mode";

const MODE_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** 表示モードの選択。選ぶとすぐこの画面に反映して確認できる（保存するまでは画面上のプレビューのみ） */
export function ColorModePicker({ initialMode }: { initialMode: ColorMode }) {
  const [mode, setMode] = useState<ColorMode>(initialMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  // 保存せずに画面を離れたら、プレビューを元に戻す
  useEffect(() => {
    const root = document.documentElement;
    return () => {
      root.dataset.theme = initialMode;
    };
  }, [initialMode]);

  return (
    <FieldSet>
      <FieldLegend variant="label">表示モード</FieldLegend>
      <input type="hidden" name="colorMode" value={mode} />
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
  );
}
