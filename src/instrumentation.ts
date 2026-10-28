import type { Instrumentation } from "next";
import { errorFields, logEvent } from "@/lib/log";

/**
 * サーバー側で処理しきれなかったエラーを、構造化ログ（1 行の JSON）として残す。
 * 実際のパスやクエリ（再設定用のトークンなどを含み得る）ではなく、ルートの型（/pages/[id] など）だけを書く。
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logEvent("error", "request.error", {
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: "renderSource" in context ? context.renderSource : undefined,
    ...errorFields(error),
  });
};
