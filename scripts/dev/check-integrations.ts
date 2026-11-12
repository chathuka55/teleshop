import "../seed/load-env";
import { env } from "@/config/env";
import { sendEmail } from "@/lib/email/send";
import { reportError } from "@/lib/observability/report";

/**
 * pnpm integrations:check   one test email to CONTACT_INBOX + one Sentry test event
 *
 * Uses the app's own sendEmail / reportError, so it checks exactly what the site would do with the
 * keys in .env.local (or the environment). Prints only outcomes, never keys or addresses.
 */
async function main(): Promise<void> {
  const to = env.CONTACT_INBOX;
  if (!to) {
    console.log("email:  skipped — set CONTACT_INBOX (the inbox the test goes to)");
  } else {
    const result = await sendEmail({
      to,
      subject: "Teleshop test email",
      text: `If you can read this, email from Teleshop works.\n\nSent ${new Date().toISOString()} by pnpm integrations:check.\n\n— Teleshop`,
    });
    console.log(
      result.sent
        ? "email:  sent ✓ (check the inbox, and the spam folder the first time)"
        : `email:  NOT sent — ${result.reason} (see the log line above)`,
    );
  }

  if (!env.SENTRY_DSN) {
    console.log("sentry: skipped — SENTRY_DSN is empty");
  } else {
    await reportError(new Error("Teleshop Sentry test — safe to ignore"), {
      source: "server",
      tags: { check: "integrations" },
    });
    console.log(
      "sentry: test event sent (a 'sentry.rejected' / 'sentry.unreachable' line above means it failed)",
    );
  }
}

main().catch((e: unknown) => {
  console.error("check failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
