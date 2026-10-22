"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { subscribeNewsletterAction, type NewsletterState } from "@/modules/marketing/actions";
import { Button } from "@/components/ui/Button";

const initial: NewsletterState = { status: "idle" };

/** Figma "Newsletter" (7:1129). */
export function Newsletter() {
  const [state, formAction, pending] = useActionState(subscribeNewsletterAction, initial);

  return (
    <section className="container-page pt-14 pb-16 md:pt-[88px] md:pb-24">
      <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[28px] border border-primary/25 bg-linear-to-r from-[#13203f] to-[#2a1f0a] p-6 md:p-12 lg:flex-row lg:items-center lg:justify-between">
        <span
          aria-hidden
          className="absolute -top-[120px] right-[20px] -z-10 size-[360px] rounded-full bg-accent/30 blur-[90px]"
        />
        <div className="max-w-[560px]">
          <h2 className="font-display text-[26px] font-bold md:text-[32px]">
            Get deals before everyone else
          </h2>
          <p className="mt-2.5 text-[15px] text-text-secondary">
            Weekly drops, flash sales and new arrivals from verified shops. No spam.
          </p>
        </div>

        <form action={formAction} className="w-full lg:w-[480px]" noValidate>
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/30 py-1.5 pr-1.5 pl-4 md:pl-5">
            <Mail aria-hidden className="size-[18px] shrink-0 text-text-muted" />
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email address"
              aria-invalid={state.status === "error" || undefined}
              aria-describedby="newsletter-msg"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
            <Button type="submit" disabled={pending} className="shadow-none">
              {pending ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>
          <p id="newsletter-msg" aria-live="polite" className="mt-2 min-h-5 pl-1 text-[13px]">
            {state.status === "error" && <span className="text-danger">{state.message}</span>}
            {state.status === "ok" && <span className="text-success">{state.message}</span>}
          </p>
        </form>
      </div>
    </section>
  );
}
