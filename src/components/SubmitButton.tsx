"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionFormPending } from "./ActionForm";

/** 送信中は無効化してスピナーを出し、二重送信を防ぐ */
export function SubmitButton({ children, pendingText, disabled, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const status = useFormStatus();
  const pending = useActionFormPending() ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Spinner aria-hidden />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
