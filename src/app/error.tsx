"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

/** App-wide error boundary. Shows only the digest — never the error message (may contain internals). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry hook-up lands in P8-T05. Do not log PII here.
    console.error("Unhandled UI error", error.digest ?? "");
  }, [error]);

  return (
    <main id="main" className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
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
    </main>
  );
}
