import type { Metadata } from "next";
import Image from "next/image";
import { InfoPage } from "@/components/ui/InfoPage";
import { modelCredits } from "@/config/model-credits";
import { productImageCredits } from "@/config/product-image-credits";
import { sellerPhotoCredits } from "@/config/seller-photo-credits";

export const metadata: Metadata = {
  title: "Image credits",
  description: "Authors and licences of the product photos and 3D models used on Teleshop.",
};

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Attribution for the freely licensed photos and 3D models (CC BY / CC BY-SA require it). */
export default function CreditsPage() {
  return (
    <InfoPage
      eyebrow="Credits"
      title="Image credits"
      intro="Product and shop photos come from Wikimedia Commons and the 3D models from Sketchfab, used under the licences below. Each photo shows the product or the closest model available."
    >
      <h2 className="mb-4 font-display text-xl font-bold">3D models</h2>
      <ul className="mb-10 grid gap-3 sm:grid-cols-2">
        {modelCredits.map((m) => (
          <li
            key={m.file}
            className="rounded-[18px] border border-line bg-surface p-4 text-[13px] leading-snug"
          >
            <a href={m.source} {...external} className="font-semibold text-text hover:text-primary-light">
              {m.title}
            </a>
            <span className="mt-1 block text-text-secondary">
              by{" "}
              <a href={m.authorUrl} {...external} className="hover:text-text">
                {m.author}
              </a>
            </span>
            <span className="mt-1 block text-text-muted">
              <a href={m.licenceUrl} {...external} className="hover:text-text">
                {m.licence}
              </a>
              {` · ${m.changes}`}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mb-4 font-display text-xl font-bold">Shop photos</h2>
      <PhotoCredits credits={sellerPhotoCredits} />

      <h2 className="mt-10 mb-4 font-display text-xl font-bold">Product photos</h2>
      <PhotoCredits credits={productImageCredits} />
    </InfoPage>
  );
}

type PhotoCredit = {
  file: string;
  title: string;
  page: string;
  author: string;
  licence: string;
  licenceUrl: string;
  changes: string;
};

function PhotoCredits({ credits }: { credits: readonly PhotoCredit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {credits.map((c) => (
        <li key={c.file} className="flex gap-3.5 rounded-[18px] border border-line bg-surface p-3">
          <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
            <Image src={c.file} alt="" fill sizes="80px" className="object-contain p-1.5" />
          </span>
          <span className="min-w-0 text-[13px] leading-snug">
            <a
              href={c.page}
              {...external}
              className="line-clamp-2 font-semibold text-text hover:text-primary-light"
            >
              {c.title.replace(/^File:/, "")}
            </a>
            <span className="mt-1 block truncate text-text-secondary">by {c.author}</span>
            <span className="mt-1 block text-text-muted">
              {c.licenceUrl ? (
                <a href={c.licenceUrl} {...external} className="hover:text-text">
                  {c.licence}
                </a>
              ) : (
                c.licence
              )}
              {` · ${c.changes}`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
