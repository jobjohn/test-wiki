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
      <div className="auth-lead">
        <ShieldCheck size={22} aria-hidden />
        <p>
          認証アプリに表示されている <strong>6 桁のパスコード</strong> を入力してください。
        </p>
      </div>
      <MfaChallengeForm next={next} />
      <p className="auth-footer">
        <Link href="/login">
          <ArrowLeft size={14} aria-hidden />
          ログイン画面に戻る
        </Link>
      </p>
    </>
  );
}
