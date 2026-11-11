"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type ErrorProps = { error: Error & { digest?: string }; reset: () => void };

/**
 * Sends a browser-side error to the server (P8-T05). Errors from the server carry a `digest` and
 * were already reported by instrumentation.ts, so only digest-less (client) errors are sent.
 */
function useReportClientError(error: ErrorProps["error"]): void {
  useEffect(() => {
    if (error.digest) return;
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: error.name.slice(0, 100),
        message: error.message.slice(0, 500),
        stack: error.stack?.slice(0, 4000),
        path: window.location.pathname.slice(0, 300),
      }),
    }).catch(() => undefined);
  }, [error]);
}

/**
 * Error boundary content: never shows the error message (it may contain internals), only the
 * reference (digest) that support can match to the server log. No <main> of its own — section
 * layouts already have one; the root error pages wrap it.
 */
export function ErrorState({ error, reset, className }: ErrorProps & { className?: string }) {
  useReportClientError(error);
  return (
    <div className={cn("grid place-items-center px-4 py-16", className)}>
      <div role="alert" className="flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-text-secondary">Please try again. If it keeps happening, contact support.</p>
        {error.digest && <p className="mt-2 text-xs text-text-muted">Reference: {error.digest}</p>}
        <div className="mt-8 flex gap-3">
          <Button onClick={reset}>
            <RotateCcw aria-hidden /> Try again
          </Button>
          <ButtonLink href="/" variant="glass">
            Home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** Default export for section `error.tsx` files: keeps the section's navbar / sidebar around it. */
export default function SectionError(props: ErrorProps) {
  return <ErrorState {...props} className="min-h-[50vh]" />;
}
