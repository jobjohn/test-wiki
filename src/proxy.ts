import { NextResponse, type NextRequest } from "next/server";

/** ログインが必要なページから /login へ送るとき、元のパスを戻り先として使えるようにする */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-wiki-path", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
