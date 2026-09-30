import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";
import { safeNext } from "@/lib/access";
import { getPendingMfaUser } from "@/lib/session";

export const metadata: Metadata = { title: "二段階認証" };

export default async function MfaChallengePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!(await getPendingMfaUser())) redirect("/login");
  const next = safeNext((await searchParams).next) ?? "";

  return (
    <>
      <div className="flex items-start gap-2.5 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>
          認証アプリに表示されている <strong>6 桁のパスコード</strong> を入力してください。
        </p>
      </div>
      <MfaChallengeForm next={next} />
      <Link href="/login" className="inline-flex items-center justify-center gap-1 text-sm text-link hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden />
        ログイン画面に戻る
      </Link>
    </>
  );
}
