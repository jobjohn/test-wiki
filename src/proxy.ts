import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, createNonce, isCspExempt } from "@/lib/csp";
import { isSecure } from "@/lib/env";

/**
 * - ログインが必要なページから /login へ送るとき、元のパスを戻り先として使えるようにする
 * - 画面には nonce 付きの Content-Security-Policy を付ける（Next.js はリクエストの CSP から nonce を読み取り、自身のスクリプトに付ける）
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-wiki-path", request.nextUrl.pathname + request.nextUrl.search);
  if (isCspExempt(request.nextUrl.pathname)) return NextResponse.next({ request: { headers } });

  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development", https: isSecure() });
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
