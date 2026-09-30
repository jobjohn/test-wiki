"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/** 送信中は無効化して二重送信を防ぐ */
export function SubmitButton({ children, pendingText, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...props} disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
