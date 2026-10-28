"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createReviewAction } from "@/modules/reviews/actions";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

const valuesOf = (s: FormState): Record<string, string> => (s.status === "error" && s.values) || {};
const words = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Verified-purchase review for one delivered item (P5-T05). */
export function ReviewForm({
  orderNo,
  itemId,
  itemName,
}: {
  orderNo: string;
  itemId: string;
  itemName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReviewAction, idleState);
  const v = valuesOf(state);
  const [rating, setRating] = useState(Number(v.rating) || 0);
  const fields = state.status === "error" ? state.fields : undefined;
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  if (!open) {
    return (
      <Button variant="glass" size="sm" onClick={() => setOpen(true)}>
        <Star aria-hidden /> Write a review
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="mt-2 flex w-full flex-col gap-3 rounded-2xl border border-line bg-white/3 p-4"
    >
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="itemId" value={itemId} />
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-text-secondary">
          Your rating for {itemName}
        </legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <Star
                aria-hidden
                className={cn(
                  "size-7 rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-primary-light",
                  n <= rating ? "fill-accent text-accent" : "text-text-muted",
                )}
              />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"} — {words[n]}
              </span>
            </label>
          ))}
          <span className="ml-2 text-sm text-text-secondary" aria-hidden>
            {words[rating]}
          </span>
        </div>
        <FieldError>{fields?.rating}</FieldError>
      </fieldset>
      <div>
        <label htmlFor={`${id}-title`} className="mb-1.5 block text-[13px] font-medium text-text-secondary">
          Title (optional)
        </label>
        <input
          id={`${id}-title`}
          name="title"
          maxLength={100}
          defaultValue={v.title}
          placeholder="Sum it up in a few words"
          className="h-11 w-full rounded-[14px] border border-line bg-white/4 px-4 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60"
        />
        <FieldError>{fields?.title}</FieldError>
      </div>
      <div>
        <label htmlFor={`${id}-comment`} className="mb-1.5 block text-[13px] font-medium text-text-secondary">
          Your review (optional)
        </label>
        <textarea
          id={`${id}-comment`}
          name="comment"
          rows={4}
          maxLength={2000}
          defaultValue={v.comment}
          placeholder="What did you like? Anything other buyers should know?"
          className="w-full rounded-[14px] border border-line bg-white/4 px-4 py-3 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60"
        />
        <FieldError>{fields?.comment}</FieldError>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post review"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
