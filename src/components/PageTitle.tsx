import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageTitle({ icon: Icon, children, className }: { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <h1 className={cn("flex items-center gap-2.5 text-2xl leading-tight font-bold tracking-tight", className)}>
      {Icon && <Icon className="size-6 shrink-0 text-primary" aria-hidden />}
      {children}
    </h1>
  );
}
