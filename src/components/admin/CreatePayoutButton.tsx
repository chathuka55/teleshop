"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPayoutAction } from "@/modules/admin/actions";
import { idleState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/forms/fields";

/** Schedules a payout of everything the shop's couriers collected since its last payout. */
export function CreatePayoutButton({ sellerId, disabled }: { sellerId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(createPayoutAction, idleState);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="sellerId" value={sellerId} />
      <Button type="submit" size="sm" disabled={pending || disabled}>
        {pending ? "Creating…" : "Create payout"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
