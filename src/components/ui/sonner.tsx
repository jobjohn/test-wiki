"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

type Theme = NonNullable<ToasterProps["theme"]>;

// 表示モードの設定は <html data-theme> にある（設定画面のプレビューでも書き換わる）ので、それを購読する
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

/** 操作結果の通知（トースト）。色は shadcn/ui のトークンに、明暗は表示モードの設定に合わせる */
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "rounded-2xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
