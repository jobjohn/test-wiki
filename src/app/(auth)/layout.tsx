import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { FlashBanner } from "@/components/FlashBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readFlash } from "@/lib/flash";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { wikiName } = getSettings();
  return (
    <div
      className="grid min-h-svh place-items-center bg-muted p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--primary) 28%, transparent), transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--highlight) 24%, transparent), transparent 45%)",
      }}
    >
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="justify-items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[inset_0_-5px_0_var(--highlight)]">
            <BookOpen className="size-7" aria-hidden />
          </span>
          <CardTitle className="text-xl">{wikiName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FlashBanner flash={await readFlash()} />
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
