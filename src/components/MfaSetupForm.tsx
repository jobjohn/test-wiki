"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Check, ChevronRight } from "lucide-react";
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
            <h3 className="flex items-center gap-2.5">
              <Badge>1</Badge>
              認証アプリで QR コードを読み取ります
            </h3>
            <p className="text-sm text-muted-foreground">Google Authenticator、Microsoft Authenticator、1Password などが使えます。</p>
            <Card size="sm" className="w-fit">
              <CardContent className="[&_svg]:block [&_svg]:size-48" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </Card>
            <Collapsible className="group/manual">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="link" size="sm" className="h-auto px-0">
                  <ChevronRight className="transition-transform group-data-[state=open]/manual:rotate-90" aria-hidden />
                  QR コードを読み取れない場合
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="my-2 text-muted-foreground">アプリに次のキーを手入力してください。</p>
                <CopyText text={secret} display={secret.replace(/(.{4})/g, "$1 ").trim()} />
              </CollapsibleContent>
            </Collapsible>
          </li>
          <li className="grid gap-3">
            <h3 className="flex items-center gap-2.5">
              <Badge>2</Badge>
              アプリに表示された 6 桁のパスコードを入力します
            </h3>
            <form action={action} className="flex flex-wrap items-center gap-3">
              <InputOTP
                name="code"
                maxLength={6}
                value={code}
                onChange={setCode}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="パスコード"
              >
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
