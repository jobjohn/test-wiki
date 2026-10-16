import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";
import { safeNext } from "@/lib/access";
import { getPendingMfaUser } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "二段階認証" };

export default async function MfaChallengePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!(await getPendingMfaUser())) redirect("/login");
  const next = safeNext((await searchParams).next) ?? "";

  return (
    <>
      <div className="flex items-start gap-2.5 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          認証アプリに表示されている <strong>6 桁のパスコード</strong> を入力してください。
        </p>
      </div>
      <MfaChallengeForm next={next} />
      <Button variant="link" asChild className="h-auto p-0">
        <Link href="/login">
          <ArrowLeft className="size-3.5" aria-hidden />
          ログイン画面に戻る
        </Link>
      </Button>
    </>
  );
}
