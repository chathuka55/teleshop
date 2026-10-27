"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { avatarAction } from "@/modules/users/actions";
import { idleState } from "@/lib/validation/form";
import { initials } from "@/lib/utils/strings";

/**
 * Profile photo: click the photo (or the camera badge) to pick a file — it uploads straight away.
 * JPG, PNG or WebP up to 4 MB; the server re-checks the bytes and makes a 320 px WebP.
 */
export function AvatarForm({ name, image }: { name: string; image: string | null }) {
  const [state, action, busy] = useActionState(avatarAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const message = state.status !== "idle" ? state : null;
  const router = useRouter();

  // The action's own render still had the old session cookie; refetch so the navbar shows the change.
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  return (
    <div className="flex flex-col gap-1.5">
      <form ref={formRef} action={action}>
        <label className="group relative block size-20 cursor-pointer md:size-24" aria-busy={busy}>
          <span className="sr-only">Change profile photo</span>
          {image ? (
            <Image
              src={image}
              alt=""
              width={96}
              height={96}
              className="size-full rounded-[22px] object-cover ring-2 ring-line"
            />
          ) : (
            <span className="grid size-full place-items-center rounded-[22px] bg-linear-to-br from-primary-light to-[#1e40af] font-display text-2xl font-bold">
              {initials(name)}
            </span>
          )}
          <span className="absolute -right-1.5 -bottom-1.5 grid size-8 place-items-center rounded-full border-2 border-bg bg-primary text-on-primary transition-transform group-hover:scale-110">
            {busy ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Camera aria-hidden className="size-4" />
            )}
          </span>
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              if (e.currentTarget.files?.length) formRef.current?.requestSubmit();
            }}
          />
        </label>
      </form>
      {image && (
        <form action={action}>
          <input type="hidden" name="intent" value="remove" />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-danger"
          >
            <Trash2 aria-hidden className="size-3" /> Remove photo
          </button>
        </form>
      )}
      {message && (
        <p
          role={message.status === "ok" ? "status" : "alert"}
          className={message.status === "ok" ? "text-xs text-success" : "max-w-[220px] text-xs text-danger"}
        >
          {message.message}
        </p>
      )}
    </div>
  );
}
