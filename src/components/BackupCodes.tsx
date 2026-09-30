"use client";

import { Check, KeyRound, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyText } from "./CopyText";

/** バックアップコード（この画面でしか表示されない） */
export function BackupCodes({ codes, title = "バックアップコード" }: { codes: string[]; title?: string }) {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="size-[18px] text-primary" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertDescription className="text-foreground">
            スマートフォンを紛失した場合などに、パスコードの代わりに使えます。<strong>この画面を離れると再表示できません。</strong>
            印刷するか安全な場所に保管してください（各コードは 1 回のみ使用可能）。
          </AlertDescription>
        </Alert>
        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4">
          {codes.map((code) => (
            <li key={code}>
              <CopyText text={code} className="text-sm" />
            </li>
          ))}
        </ul>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            印刷
          </Button>
          <Button asChild>
            <Link href="/account">
              <Check aria-hidden />
              保管しました
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
