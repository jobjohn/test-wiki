import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { FlashBanner } from "@/components/FlashBanner";
import { readFlash } from "@/lib/flash";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { wikiName } = getSettings();
  return (
    <div className="auth-body">
      <main className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark brand-mark-large">
            <BookOpen size={28} aria-hidden />
          </span>
          <h1>{wikiName}</h1>
        </div>
        <FlashBanner flash={await readFlash()} />
        {children}
      </main>
    </div>
  );
}
