"use client";

import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const keyOf = (value: string) => value.trim().normalize("NFKC").toLowerCase();

/**
 * タグの複数選択。既存のタグ（Wiki ページと共通）をメニューから選ぶか、名前を入力して Enter で追加する。
 * 選んだタグは name の hidden 入力に、カンマ区切りで入る（Wiki ページのタグ入力と同じ形式）。
 */
export function TagPicker({
  name,
  value,
  onChange,
  suggestions,
  id,
}: {
  name: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const selected = new Set(value.map(keyOf));

  const add = (raw: string) => {
    const names = raw
      .split(/[,、，\s　]+/)
      .map((n) => n.replace(/\//g, "").trim().slice(0, 50))
      .filter(Boolean);
    const next = [...value];
    for (const n of names) {
      const known = suggestions.find((s) => keyOf(s) === keyOf(n)) ?? n;
      if (!next.some((t) => keyOf(t) === keyOf(known))) next.push(known);
    }
    onChange(next);
    setDraft("");
  };
  const remove = (tag: string) => onChange(value.filter((t) => keyOf(t) !== keyOf(tag)));
  const toggle = (tag: string, on: boolean) => (on ? add(tag) : remove(tag));

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={value.join(", ")} />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="選択中のタグ">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="highlight" asChild>
                <button type="button" onClick={() => remove(tag)} aria-label={`タグ「${tag}」を外す`}>
                  <TagIcon aria-hidden />
                  {tag}
                  <X aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          list={listId}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (draft.trim()) add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder="タグ名を入力して Enter"
          autoComplete="off"
        />
        <datalist id={listId}>
          {suggestions
            .filter((s) => !selected.has(keyOf(s)))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
        {suggestions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <Plus aria-hidden />
                タグを選択
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuLabel>既存のタグ</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {suggestions.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={selected.has(keyOf(s))}
                  onCheckedChange={(on) => toggle(s, on)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
