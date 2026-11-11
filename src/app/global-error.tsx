"use client";

import { ErrorState, type ErrorProps } from "@/components/layout/ErrorState";
import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout itself (P8-T05). It replaces the whole
 * document, so it brings its own <html>/<body> and stylesheet (the web fonts are not loaded here).
 */
export default function GlobalError(props: ErrorProps) {
  return (
    <html lang="en-LK">
      <body className="min-h-dvh">
        <main id="main">
          <ErrorState {...props} className="min-h-dvh" />
        </main>
      </body>
    </html>
  );
}
