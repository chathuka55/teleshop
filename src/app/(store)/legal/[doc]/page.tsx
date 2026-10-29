import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { InfoPage, Prose } from "@/components/ui/InfoPage";

type Doc = { title: string; intro: string; body: ReactNode };

const docs: Record<string, Doc> = {
  terms: {
    title: "Terms of Service",
    intro: "The rules for buying and selling on Teleshop.",
    body: (
      <>
        <h2>1. Who we are</h2>
        <p>
          Teleshop (Pvt) Ltd runs a marketplace where independent, verified shops sell to customers in Sri
          Lanka. The shop that lists a product is the seller of that product.
        </p>
        <h2>2. Orders and Cash on Delivery</h2>
        <ul>
          <li>
            Prices are shown in Sri Lankan Rupees and are confirmed by our server when you place the order.
          </li>
          <li>You pay the courier in cash when each package arrives. Please have the exact amount ready.</li>
          <li>
            Orders may be cancelled by you, the shop or Teleshop until the package is handed to the courier.
          </li>
        </ul>
        <h2>3. Delivery and tracking</h2>
        <p>
          Each shop ships its own package. A courier tracking code is added to your order once it is handed
          over.
        </p>
        <h2>4. Returns and warranty</h2>
        <p>
          Faulty items can be replaced within 7 days. Warranty type and length are listed on each product. See
          the <Link href="/help#returns">returns help page</Link>.
        </p>
        <h2>5. Seller obligations</h2>
        <p>
          Sellers must list genuine products with accurate specifications, keep stock up to date and ship on
          time.
        </p>
        <h2>6. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    intro: "What we collect, why, and how we protect it.",
    body: (
      <>
        <h2>1. What we collect</h2>
        <ul>
          <li>Account details: name, email, phone and (optionally) a profile photo.</li>
          <li>Delivery addresses you save, and the address snapshot on each order.</li>
          <li>Order history, reviews you write, and basic security logs (hashed IP addresses).</li>
        </ul>
        <h2>2. How we use it</h2>
        <p>
          To deliver your orders, let shops fulfil them, send order updates and keep the marketplace safe from
          fraud. We do not sell your personal data.
        </p>
        <h2>3. Who we share it with</h2>
        <p>
          The shop that fulfils your package and the courier that delivers it receive your name, phone and
          delivery address — nothing more.
        </p>
        <h2>4. Security</h2>
        <p>
          Passwords are hashed with Argon2id, data is encrypted in transit and at rest, and staff access is
          logged. We never store card details.
        </p>
        <h2>5. Your choices</h2>
        <p>
          You can edit or delete saved addresses at any time and ask us to close your account by emailing{" "}
          <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
        </p>
      </>
    ),
  },
};

/** Own keys only: a plain index would also "find" `constructor`, `toString`… */
const docFor = (key: string): Doc | undefined => (Object.hasOwn(docs, key) ? docs[key] : undefined);

type Props = { params: Promise<{ doc: string }> };

// No generateStaticParams: a prerendered page carries no CSP nonce, so its scripts would be
// blocked by the strict-dynamic policy in production. Every HTML page renders per request.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = docFor((await params).doc);
  return doc ? { title: doc.title, description: doc.intro } : { title: "Not found" };
}

/** Figma "18 · Info — Terms & Privacy" (20:2417). */
export default async function LegalPage({ params }: Props) {
  const doc = docFor((await params).doc);
  if (!doc) notFound();
  return (
    <InfoPage eyebrow="LEGAL" title={doc.title} intro={doc.intro} updated="22 October 2026">
      <p className="mx-auto mb-6 max-w-[72ch] rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-[13px] text-accent">
        Draft for development — to be reviewed by a lawyer before launch.
      </p>
      <Prose>{doc.body}</Prose>
    </InfoPage>
  );
}
