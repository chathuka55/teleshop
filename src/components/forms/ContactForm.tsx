"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { sendContactMessageAction, type ContactState } from "@/modules/marketing/actions";
import { Button } from "@/components/ui/Button";
import { FieldError, Label } from "@/components/ui/Input";

const initial: ContactState = { status: "idle" };
const field =
  "w-full rounded-[14px] border border-line bg-white/4 px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-primary-light/60 aria-[invalid=true]:border-danger/60";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessageAction, initial);
  const f = state.status === "error" ? state.fields : undefined;
  const v = (state.status === "error" && state.values) || {};

  if (state.status === "ok") {
    return (
      <p
        role="status"
        className="rounded-[18px] border border-success/30 bg-success/10 p-6 text-center text-success"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="c-name">Full name</Label>
        <input
          id="c-name"
          name="name"
          defaultValue={v.name}
          autoComplete="name"
          required
          aria-invalid={!!f?.name}
          className={field}
        />
        <FieldError>{f?.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="c-email">Email</Label>
        <input
          id="c-email"
          name="email"
          defaultValue={v.email}
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!f?.email}
          className={field}
        />
        <FieldError>{f?.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="c-phone">Phone (optional)</Label>
        <input
          id="c-phone"
          name="phone"
          defaultValue={v.phone}
          type="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          aria-invalid={!!f?.phone}
          className={field}
        />
        <FieldError>{f?.phone}</FieldError>
      </div>
      <div>
        <Label htmlFor="c-topic">Topic</Label>
        <select
          id="c-topic"
          name="topic"
          defaultValue={v.topic ?? "order"}
          className={`${field} [&>option]:bg-surface`}
        >
          <option value="order">An order</option>
          <option value="returns">Returns &amp; warranty</option>
          <option value="selling">Selling on Teleshop</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="c-message">Message</Label>
        <textarea
          id="c-message"
          name="message"
          defaultValue={v.message}
          rows={5}
          maxLength={2000}
          required
          aria-invalid={!!f?.message}
          className={field}
        />
        <FieldError>{f?.message}</FieldError>
      </div>
      {state.status === "error" && !state.fields && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="sm:col-span-2 sm:justify-self-start">
        <Send aria-hidden /> {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
