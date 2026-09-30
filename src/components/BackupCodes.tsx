"use client";

import { Check, KeyRound, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CopyText } from "./CopyText";

/** バックアップコード（この画面でしか表示されない） */
export function BackupCodes({ codes, title = "バックアップコード" }: { codes: string[]; title?: string }) {
  return (
    <div className="form-card form-narrow">
      <h2 className="form-section">
        <KeyRound size={18} aria-hidden /> {title}
      </h2>
      <div className="notice-box">
        <TriangleAlert size={18} aria-hidden />
        <div>
          スマートフォンを紛失した場合などに、パスコードの代わりに使えます。<strong>この画面を離れると再表示できません。</strong>
          印刷するか安全な場所に保管してください（各コードは 1 回のみ使用可能）。
        </div>
      </div>
      <ul className="backup-codes">
        {codes.map((code) => (
          <li key={code}>
            <CopyText text={code} />
          </li>
        ))}
      </ul>
      <div className="form-actions">
        <button type="button" className="button" onClick={() => window.print()}>
          <Printer size={18} aria-hidden />
          <span>印刷</span>
        </button>
        <Link href="/account" className="button button-primary">
          <Check size={18} aria-hidden />
          <span>保管しました</span>
        </Link>
      </div>
    </div>
  );
}
