import { CircleCheck } from "lucide-react";

/**
 * Confirmation after an action that moves its row out of the list (the row's own message would
 * vanish with it). The page picks the text from a fixed map by `?done=` — never echoed from the URL.
 */
export function DoneBanner({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-[18px] border border-success/35 bg-success/10 px-4 py-3 text-sm"
    >
      <CircleCheck aria-hidden className="size-5 shrink-0 text-success" /> {message}
    </p>
  );
}
