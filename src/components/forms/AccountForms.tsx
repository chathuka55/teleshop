"use client";

import { useActionState } from "react";
import { Lock, LogOut, MailCheck, Smartphone, User } from "lucide-react";
import { resendVerificationAction } from "@/modules/auth/actions";
import { changePasswordAction, signOutEverywhereAction, updateProfileAction } from "@/modules/users/actions";
import { idleState, type FormState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FormMessage, PasswordField, TextField } from "./fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, idleState);
  const f = fieldsOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          icon={<User />}
          error={f.name}
          required
        />
        <TextField
          label="Mobile number"
          name="phone"
          defaultValue={phone ?? ""}
          type="tel"
          autoComplete="tel"
          placeholder="07X XXX XXXX"
          icon={<Smartphone />}
          error={f.phone}
        />
      </div>
      <TextField label="Email" name="emailReadOnly" defaultValue={email} type="email" readOnly disabled />
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

/** Shown while the email is unverified (needed before Cash on Delivery checkout). */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, idleState);
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-[18px] border border-accent/35 bg-accent/10 p-4 sm:flex-row sm:items-center"
    >
      <MailCheck aria-hidden className="size-5 shrink-0 text-accent" />
      <p className="flex-1 text-sm">
        Please verify <strong>{email}</strong> — you need a verified email to check out with Cash on Delivery.
        {state.status !== "idle" && <span className="mt-1 block text-text-secondary">{state.message}</span>}
      </p>
      <Button type="submit" variant="glass" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Resend link"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, idleState);
  const f = fieldsOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <PasswordField
        label="Current password"
        name="currentPassword"
        autoComplete="current-password"
        icon={<Lock />}
        error={f.currentPassword}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          icon={<Lock />}
          error={f.password}
          required
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          icon={<Lock />}
          error={f.confirmPassword}
          required
        />
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
      <p className="text-xs text-text-muted">Changing your password signs you out on every device.</p>
    </form>
  );
}

export function SignOutEverywhereButton() {
  return (
    <form action={signOutEverywhereAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut aria-hidden className="size-4!" />
        Sign out on all devices
      </Button>
    </form>
  );
}
