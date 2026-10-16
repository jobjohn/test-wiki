import { notFound } from "next/navigation";

/** URL の ID を数値にする。数字以外は 404 */
export function parseId(value: string): number {
  if (!/^\d+$/.test(value)) notFound();
  return Number(value);
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** searchParams の値を 1 つの文字列にする */
export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
