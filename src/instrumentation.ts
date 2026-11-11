import type { Instrumentation } from "next";

/**
 * Next calls `onRequestError` for every uncaught server error — rendering, Server Actions, route
 * handlers, middleware (P8-T05). `notFound()` / `redirect()` never arrive here. The report carries
 * Next's `digest`, the same reference the error page shows the visitor, so a support request can
 * be matched to its log line. Request headers (cookies, IP) are deliberately not passed on.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { isRenderStandIn } = await import("@/lib/observability/request-error");
  if (isRenderStandIn(error)) return; // the original error was reported already
  const ctx = {
    source: "server" as const,
    path: request.path,
    method: request.method,
    tags: { routeType: context.routeType, routePath: context.routePath, routerKind: context.routerKind },
  };
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("@/lib/observability/report");
    await reportError(error, ctx);
    return;
  }
  // Edge (middleware): log only — the Sentry sender reads the Node environment config.
  const { logger } = await import("@/lib/observability/logger");
  const { pathOnly, scrubError } = await import("@/lib/observability/scrub");
  logger.error("error", { ...ctx, path: pathOnly(ctx.path), error: scrubError(error) });
};
