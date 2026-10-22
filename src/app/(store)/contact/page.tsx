import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/components/forms/ContactForm";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get help with an order, a return or selling on Teleshop.",
};

const channels: readonly { icon: LucideIcon; label: string; value: string; href?: string }[] = [
  {
    icon: Phone,
    label: "Call us",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`,
  },
  { icon: Mail, label: "Email", value: siteConfig.contact.email, href: `mailto:${siteConfig.contact.email}` },
  { icon: MapPin, label: "Office", value: siteConfig.contact.address },
  { icon: Clock, label: "Hours", value: "Mon–Sat, 9.00 am – 6.00 pm" },
];

/** Figma "16 · Contact Us" (20:1810). */
export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="CONTACT"
      title="We’re here to help"
      intro="Questions about an order, a return or selling with us? Send a message and we’ll get back within one working day."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <ul className="flex flex-col gap-3">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <li
              key={label}
              className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/14 text-primary-light">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-text-secondary">{label}</span>
                {href ? (
                  <a href={href} className="text-sm font-semibold hover:text-primary-light">
                    {value}
                  </a>
                ) : (
                  <span className="text-sm font-semibold">{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <section
          aria-label="Contact form"
          className="rounded-[22px] border border-line bg-surface p-5 md:p-8"
        >
          <ContactForm />
        </section>
      </div>
    </InfoPage>
  );
}
