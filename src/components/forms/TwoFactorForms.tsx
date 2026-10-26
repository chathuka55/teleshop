"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Copy, Download, KeyRound, ShieldCheck } from "lucide-react";
import {
  confirmEnrolmentAction,
  finishEnrolmentAction,
  verifySecondFactorAction,
  type TwoFactorFormState,
} from "@/modules/auth/two-factor-actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "./fields";

const idle: TwoFactorFormState = { status: "idle" };

function ErrorLine({ state }: { state: TwoFactorFormState }) {
  return state.status === "error" ? (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger"
    >
      {state.message}
    </p>
  ) : null;
}

function CodeField({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <TextField
        label={label}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={20}
        placeholder="123 456"
        icon={<KeyRound />}
        required
      />
      {hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/** Enrolment: scan the QR (or type the key), confirm one code, then save the recovery codes. */
export function EnrolTotpForm({ qr, manualKey, next }: { qr: string; manualKey: string; next: string }) {
  const [state, action, pending] = useActionState(confirmEnrolmentAction, idle);
  if (state.status === "enrolled") {
    return <RecoveryCodes codes={state.recoveryCodes} next={state.next} proof={state.proof} />;
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <ol className="flex flex-col gap-4 text-sm text-text-secondary">
        <li>
          <strong className="text-text">1.</strong> Open an authenticator app (Google Authenticator, Microsoft
          Authenticator, Authy or 1Password) and scan this code:
        </li>
      </ol>
      <div className="flex flex-col items-center gap-3 rounded-[18px] border border-line bg-white p-4 sm:flex-row sm:bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URI generated on the server */}
        <img
          src={qr}
          alt="QR code for your authenticator app"
          width={176}
          height={176}
          className="rounded-xl bg-white p-2"
        />
        <div className="text-center sm:text-left">
          <p className="text-xs text-text-muted">Can&apos;t scan? Type this key:</p>
          <code className="mt-1 block font-mono text-sm tracking-wider break-all text-text">{manualKey}</code>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        <strong className="text-text">2.</strong> Enter the 6-digit code the app shows:
      </p>
      <CodeField label="Code from the app" />
      <ErrorLine state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Turn on two-step verification"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

function RecoveryCodes({ codes, next, proof }: { codes: string[]; next: string; proof: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Teleshop admin recovery codes (each works once)\n\n${codes.join("\n")}\n`;
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2.5 rounded-[14px] border border-success/30 bg-success/10 p-4 text-sm">
        <ShieldCheck aria-hidden className="size-5 shrink-0 text-success" />
        Two-step verification is on. Save these recovery codes somewhere safe — each one signs you in once if
        you lose your phone. They are shown only now.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-[18px] border border-line bg-surface p-4 font-mono text-[15px] tracking-wider">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download="teleshop-recovery-codes.txt"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-line-strong bg-white/6 px-3.5 text-sm font-semibold hover:bg-white/10"
        >
          <Download aria-hidden className="size-4" /> Download
        </a>
      </div>
      <form action={finishEnrolmentAction}>
        <input type="hidden" name="proof" value={proof} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" size="lg" className="w-full">
          I saved them — continue <ArrowRight aria-hidden />
        </Button>
      </form>
    </div>
  );
}

/** Sign-in step 2 for admins who already use two-step verification. */
export function VerifyTotpForm({ next, recoveryLeft }: { next: string; recoveryLeft: number }) {
  const [state, action, pending] = useActionState(verifySecondFactorAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <CodeField
        label="6-digit code or recovery code"
        hint={`Open your authenticator app. Lost your phone? Use a recovery code (${recoveryLeft} left).`}
      />
      <ErrorLine state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Verify"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
