import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { FlashBanner } from "@/components/FlashBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readFlash } from "@/lib/flash";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { wikiName } = getSettings();
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <BookOpen className="size-5" aria-hidden />
            {wikiName}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FlashBanner flash={await readFlash()} />
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
