"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** 操作結果の通知（トースト）。色は shadcn/ui のトークンに合わせる */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
