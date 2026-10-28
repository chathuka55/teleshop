"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { productImageAction, uploadProductImageAction } from "@/modules/products/actions";
import { MAX_PRODUCT_IMAGES } from "@/modules/products/access";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

/** Product photos (P6-T03): upload (checked + re-encoded on the server), set cover, remove. */
export function ProductImages({ id, images }: { id: string; images: readonly { url: string }[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const done = (r: { ok: boolean; message: string }) => {
    setMessage({ ok: r.ok, text: r.message });
    if (r.ok) router.refresh();
  };

  const upload = (files: FileList | null) => {
    const list = [...(files ?? [])].slice(0, MAX_PRODUCT_IMAGES - images.length);
    if (!list.length) return;
    start(async () => {
      // One request per photo keeps each under the 4 MB Server Action limit.
      for (const file of list) {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("image", file);
        const r = await uploadProductImageAction(fd);
        if (!r.ok) return done(r);
      }
      done({ ok: true, message: list.length > 1 ? `${list.length} photos added.` : "Photo added." });
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Photos{" "}
          <span className="text-sm font-normal text-text-secondary">
            ({images.length}/{MAX_PRODUCT_IMAGES})
          </span>
        </h2>
        {images.length < MAX_PRODUCT_IMAGES && (
          <>
            <input
              ref={fileRef}
              id={`photos-${id}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => upload(e.target.files)}
            />
            <Button variant="glass" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
              <ImagePlus aria-hidden /> {pending ? "Uploading…" : "Add photos"}
            </Button>
          </>
        )}
      </div>
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-secondary">
          JPG, PNG or WebP up to 4 MB each. Clear photos on a plain background sell best — the first one is
          the cover.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-white/4"
            >
              <Image src={img.url} alt="" fill sizes="200px" className="object-contain p-2" />
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5">
                {i > 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => done(await productImageAction({ id, url: img.url, action: "cover" })))
                    }
                    className="grid size-8 place-items-center rounded-lg bg-black/60 hover:bg-black/80"
                    aria-label={`Make photo ${i + 1} the cover`}
                  >
                    <Star aria-hidden className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => done(await productImageAction({ id, url: img.url, action: "remove" })))
                  }
                  className="grid size-8 place-items-center rounded-lg bg-black/60 text-danger hover:bg-black/80"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn("text-[13px]", message.ok ? "text-success" : "text-danger")}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
