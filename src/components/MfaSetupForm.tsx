"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { enableMfaAction } from "@/actions/account";
import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BackupCodes } from "./BackupCodes";
import { CopyText } from "./CopyText";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function MfaSetupForm({ secret, qrSvg }: { secret: string; qrSvg: string }) {
  const [state, action] = useActionState(enableMfaAction, {});
  const [code, setCode] = useState("");
  if (state.backupCodes) return <BackupCodes codes={state.backupCodes} />;

  return (
    <Card className="max-w-2xl">
      <CardContent className="grid gap-6">
        <FormErrors errors={state.errors} />
        <ol className="grid gap-8">
          <li className="grid gap-3">
            <div className="flex items-center gap-2.5 font-semibold">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">1</span>
              認証アプリで QR コードを読み取ります
            </div>
            <p className="text-sm text-muted-foreground">Google Authenticator、Microsoft Authenticator、1Password などが使えます。</p>
            <div className="w-fit rounded-lg border bg-white p-3 [&_svg]:block [&_svg]:size-48" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">QR コードを読み取れない場合</summary>
              <p className="my-2 text-muted-foreground">アプリに次のキーを手入力してください。</p>
              <CopyText text={secret} display={secret.replace(/(.{4})/g, "$1 ").trim()} className="text-base tracking-wider" />
            </details>
          </li>
          <li className="grid gap-3">
            <div className="flex items-center gap-2.5 font-semibold">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">2</span>
              アプリに表示された 6 桁のパスコードを入力します
            </div>
            <form action={action} className="flex flex-wrap items-center gap-3">
              <InputOTP name="code" maxLength={6} value={code} onChange={setCode} autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label="パスコード">
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <SubmitButton disabled={code.length !== 6} pendingText="確認中...">
                <Check aria-hidden />
                有効にする
              </SubmitButton>
            </form>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
