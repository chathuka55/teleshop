"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Hash, Lock, Mail, MapPin, Smartphone, Store, User } from "lucide-react";
import { districts } from "@/config/districts";
import {
  applySellerAction,
  registerAction,
  requestPasswordResetAction,
  signInAction,
  signInWithGoogleAction,
} from "@/modules/auth/actions";
import { shopTypes } from "@/modules/auth/schema";
import { idleState, type FormState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { CheckboxField, FormMessage, PasswordField, SelectField, TextField } from "./fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};
const valuesOf = (s: FormState): Record<string, string> => (s.status === "error" && s.values) || {};

function GoogleButton() {
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-line" /> or continue with <span className="h-px flex-1 bg-line" />
      </div>
      {/* Submits the surrounding form (with its `next` field) to Auth.js signIn("google"). */}
      <Button
        type="submit"
        formAction={signInWithGoogleAction}
        formNoValidate
        variant="glass"
        size="lg"
        className="w-full"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
          />
        </svg>
        Google
      </Button>
    </>
  );
}

export function SignInForm({ googleEnabled, next }: { googleEnabled: boolean; next?: string }) {
  const [state, action, pending] = useActionState(signInAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        label="Email address"
        name="email"
        defaultValue={v.email}
        type="email"
        autoComplete="email"
        icon={<Mail />}
        error={f.email}
        required
      />
      <PasswordField
        label={
          <span className="flex justify-between">
            Password
            <Link href="/forgot-password" className="text-primary-light hover:text-text">
              Forgot password?
            </Link>
          </span>
        }
        name="password"
        autoComplete="current-password"
        icon={<Lock />}
        error={f.password}
        required
      />
      <CheckboxField name="remember">Keep me signed in for 7 days</CheckboxField>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"} <ArrowRight aria-hidden />
      </Button>
      {googleEnabled && <GoogleButton />}
      <p className="text-center text-sm text-text-secondary">
        New to Teleshop?{" "}
        <Link href="/register" className="font-semibold text-primary-light hover:text-text">
          Create an account
        </Link>
      </p>
      <p className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-4 text-xs text-text-secondary">
        <Store aria-hidden className="size-4 shrink-0 text-primary-light" />
        Selling on Teleshop? Use the same sign in — you’ll be taken to your Seller Dashboard.
      </p>
    </form>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(registerAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <TextField
        label="Full name"
        name="name"
        defaultValue={v.name}
        autoComplete="name"
        icon={<User />}
        error={f.name}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Email"
          name="email"
          defaultValue={v.email}
          type="email"
          autoComplete="email"
          icon={<Mail />}
          error={f.email}
          required
        />
        <TextField
          label="Mobile number"
          name="phone"
          defaultValue={v.phone}
          type="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          icon={<Smartphone />}
          error={f.phone}
          required
        />
      </div>
      <PasswordField
        label="Password (10+ characters)"
        name="password"
        autoComplete="new-password"
        icon={<Lock />}
        error={f.password}
        required
      />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        icon={<Lock />}
        error={f.confirmPassword}
        required
      />
      <CheckboxField name="terms" error={f.terms}>
        I agree to the{" "}
        <Link href="/legal/terms" className="text-primary-light">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-primary-light">
          Privacy Policy
        </Link>
        .
      </CheckboxField>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"} <ArrowRight aria-hidden />
      </Button>
      {googleEnabled && <GoogleButton />}
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary-light hover:text-text">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SellerApplicationForm() {
  const [state, action, pending] = useActionState(applySellerAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <TextField
        label="Shop name"
        name="shopName"
        defaultValue={v.shopName}
        icon={<Store />}
        error={f.shopName}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Shop type"
          name="shopType"
          options={shopTypes}
          defaultValue={v.shopType ?? "mobile_shop"}
          error={f.shopType}
        />
        <TextField
          label="Business reg. no."
          name="businessRegNo"
          defaultValue={v.businessRegNo}
          placeholder="PV 00214587"
          icon={<Hash />}
          error={f.businessRegNo}
          required
        />
      </div>
      <TextField
        label="Business address"
        name="addressLine1"
        defaultValue={v.addressLine1}
        autoComplete="street-address"
        icon={<MapPin />}
        error={f.addressLine1}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="City"
          name="city"
          defaultValue={v.city}
          autoComplete="address-level2"
          error={f.city}
          required
        />
        <SelectField
          label="District"
          name="district"
          placeholder="Choose…"
          options={districts.map((d) => ({ value: d, label: d }))}
          defaultValue={v.district ?? ""}
          error={f.district}
        />
      </div>
      <TextField
        label="Shop phone"
        name="phone"
        defaultValue={v.phone}
        type="tel"
        placeholder="081 222 3344"
        icon={<Smartphone />}
        error={f.phone}
        required
      />
      <p className="rounded-[14px] border border-dashed border-line px-4 py-3 text-xs text-text-secondary">
        Next step: upload your business registration (PDF/JPG, max 5 MB) for verification.
      </p>
      <CheckboxField name="agree" error={f.agree}>
        I agree to the{" "}
        <Link href="/help#fees" className="text-primary-light">
          Seller Terms &amp; Fees policy
        </Link>
        .
      </CheckboxField>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Continue to verification"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <TextField
        label="Email address"
        name="email"
        defaultValue={v.email}
        type="email"
        autoComplete="email"
        icon={<Mail />}
        error={f.email}
        required
      />
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"} <ArrowRight aria-hidden />
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-primary-light hover:text-text">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
