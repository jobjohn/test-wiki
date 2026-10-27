"use client";

import { ErrorState } from "@/components/ErrorState";

// (app) 配下の画面で起きた例外を、サイドバー等の枠を残したまま表示する
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}
