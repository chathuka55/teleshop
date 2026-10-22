import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Help Centre & FAQ",
  description:
    "Answers about ordering, Cash on Delivery, tracking, returns, warranty and selling on Teleshop.",
};

const sections: readonly { id: string; title: string; faqs: readonly [string, string][] }[] = [
  {
    id: "ordering",
    title: "Ordering & payment",
    faqs: [
      [
        "How do I pay?",
        "Teleshop uses Cash on Delivery. You pay the courier in cash when each package arrives — no card needed.",
      ],
      [
        "Do I need an account?",
        "You can browse and build a cart as a guest. To place an order you need an account with a verified email and phone.",
      ],
      [
        "Can I order from several shops at once?",
        "Yes. Your order is split into one package per shop. Each package has its own delivery fee and tracking code.",
      ],
    ],
  },
  {
    id: "delivery",
    title: "Shipping & delivery",
    faqs: [
      [
        "How long does delivery take?",
        "Most packages arrive in 2–4 working days anywhere in Sri Lanka. Colombo and suburbs are often next day.",
      ],
      [
        "How do I track my package?",
        "Once the shop hands your package to the courier, we add the courier’s tracking code to your order. Open My Orders or use the Track page with your order number and phone.",
      ],
      [
        "How much is delivery?",
        "Standard delivery is LKR 450 per shop. Some products ship free — it says so on the product page.",
      ],
    ],
  },
  {
    id: "returns",
    title: "Returns & warranty",
    faqs: [
      [
        "What if the item is faulty?",
        "You have 7 days to request a replacement for manufacturing defects. Keep the box, accessories and invoice.",
      ],
      [
        "Who handles the warranty?",
        "The warranty type (manufacturer or shop) and length are shown on every product page. The selling shop is your first contact.",
      ],
      [
        "Can I refuse a delivery?",
        "Yes. Check the seal and condition before you pay. If something is wrong, refuse the package and contact us.",
      ],
    ],
  },
  {
    id: "sellers",
    title: "Selling on Teleshop",
    faqs: [
      [
        "Who can sell?",
        "Registered mobile, computer and accessory shops in Sri Lanka. We verify every shop before it can list.",
      ],
      [
        "How do payouts work?",
        "COD collected by couriers is reconciled and paid to shops on a regular schedule, minus the platform fee.",
      ],
    ],
  },
  {
    id: "fees",
    title: "Fees & policies",
    faqs: [
      [
        "What does it cost to sell?",
        "There is no listing fee. A small platform fee (3% in v1) applies to delivered orders only.",
      ],
    ],
  },
];

/** Figma "17 · Help Centre & FAQ" (20:2114). Native <details> — accessible without JS. */
export default function HelpPage() {
  return (
    <InfoPage
      eyebrow="HELP CENTRE"
      title="How can we help?"
      intro="Quick answers about ordering, delivery, returns and selling."
    >
      <nav aria-label="Help topics" className="flex flex-wrap justify-center gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium hover:border-line-strong"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="mb-4 font-display text-xl font-bold">{s.title}</h2>
            <div className="flex flex-col gap-2.5">
              {s.faqs.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-[16px] border border-line bg-surface open:border-primary/30"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 font-semibold">
                    {q}
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-text-secondary">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center text-sm text-text-secondary">
          Still stuck?{" "}
          <Link href="/contact" className="font-semibold text-primary-light hover:text-text">
            Contact our support team
          </Link>
        </p>
      </div>
    </InfoPage>
  );
}
