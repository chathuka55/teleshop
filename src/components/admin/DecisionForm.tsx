"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decideSellerAction, moderateProductAction } from "@/modules/admin/actions";
import { idleState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

type Choice = { value: string; label: string; variant: "primary" | "glass" | "danger"; needsNote: boolean };

const kinds = {
  seller: {
    action: decideSellerAction,
    field: "reason",
    noteLabel: "Reason for the applicant",
    choices: [
      { value: "approve", label: "Approve shop", variant: "primary", needsNote: false },
      { value: "reject", label: "Reject", variant: "danger", needsNote: true },
    ],
  },
  product: {
    action: moderateProductAction,
    field: "note",
    noteLabel: "Note for the seller",
    choices: [
      { value: "approve", label: "Approve — put on sale", variant: "primary", needsNote: false },
      { value: "return", label: "Send back for changes", variant: "glass", needsNote: true },
      { value: "block", label: "Block", variant: "danger", needsNote: true },
    ],
  },
} as const satisfies Record<
  string,
  { action: unknown; field: string; noteLabel: string; choices: readonly Choice[] }
>;

/** Approve / reject a shop (A10), approve / return / block a product (A6). */
export function DecisionForm({
  kind,
  id,
  allowed,
}: {
  kind: keyof typeof kinds;
  id: string;
  allowed: readonly string[];
}) {
  const k = kinds[kind];
  const [state, action, pending] = useActionState(k.action, idleState);
  const [choice, setChoice] = useState<Choice | null>(null);
  const router = useRouter();
  const fields = state.status === "error" ? state.fields : undefined;

  useEffect(() => {
    if (state.status === "ok") {
      setChoice(null);
      router.refresh();
    }
  }, [state, router]);

  const choices = (k.choices as readonly Choice[]).filter((c) => allowed.includes(c.value));
  if (!choices.length) return state.status === "ok" ? <FormMessage state={state} /> : null;

  return (
    <div className="flex flex-col gap-3">
      {!choice ? (
        <div className="flex flex-wrap gap-2.5">
          {choices.map((c) =>
            c.needsNote ? (
              <Button key={c.value} variant={c.variant} onClick={() => setChoice(c)}>
                {c.label}
              </Button>
            ) : (
              <form key={c.value} action={action}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="decision" value={c.value} />
                <Button type="submit" variant={c.variant} disabled={pending}>
                  {pending ? "Saving…" : c.label}
                </Button>
              </form>
            ),
          )}
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-white/3 p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={choice.value} />
          <div>
            <label htmlFor={`note-${id}`} className="mb-1.5 block text-[13px] text-text-secondary">
              {k.noteLabel}
            </label>
            <textarea
              id={`note-${id}`}
              name={k.field}
              rows={3}
              maxLength={300}
              required
              className="w-full rounded-[14px] border border-line bg-white/4 px-3.5 py-2.5 text-sm outline-none focus:border-primary-light/60"
            />
            <FieldError>{fields?.[k.field]}</FieldError>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant={choice.variant} disabled={pending}>
              {pending ? "Saving…" : choice.label}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChoice(null)} disabled={pending}>
              Back
            </Button>
          </div>
        </form>
      )}
      <FormMessage state={state} />
    </div>
  );
}
