"use client";

import { ErrorState, type ErrorProps } from "@/components/layout/ErrorState";

/**
 * App-wide error boundary (errors in a section layout, or pages without their own error.tsx).
 * Server errors were already logged + reported by src/instrumentation.ts; ErrorState reports
 * browser-only errors. Shows only the digest — never the message (P8-T05).
 */
export default function AppError(props: ErrorProps) {
  return (
    <main id="main">
      <ErrorState {...props} className="min-h-[70vh]" />
    </main>
  );
}
