import mongoose, { Types, type ClientSession } from "mongoose";
import { buildTrackingUrl } from "@/config/couriers";
import type { districts } from "@/config/districts";
import {
  AuditLogModel,
  CategoryModel,
  CounterModel,
  CourierModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  PaymentModel,
  PayoutModel,
  ProductModel,
  ReviewModel,
  SellerModel,
  SettingsModel,
  UserModel,
} from "@/db/models";
import { $gte, $in } from "@/db/operators";
import { addRatingToCaches } from "@/db/repositories/review.repository";
import { deriveOrderStatus } from "@/modules/orders/status";
import type { PackageStatus } from "@/modules/orders/types";
import { platformFee } from "@/modules/sellers/access";

/**
 * Demo sales history (pnpm db:demo-sales) — months of believable marketplace activity for the
 * portfolio site: customers, orders through every stage, courier codes, IMEIs, COD collections,
 * reviews (with rating caches), monthly shop payouts and the matching admin audit trail.
 *
 * - Deterministic (fixed PRNG seed) and validated against the real Mongoose models.
 * - Never touches existing orders. Order numbers stay chronological: history before the first
 *   existing order takes the free numbers below it, newer orders continue the counter.
 * - Open orders reserve stock exactly like checkout, so finishing them in the admin console works.
 * - Everything written is listed in the `_demo_sales` manifest; `removeDemoSales()` undoes it,
 *   including stock reservations and rating caches, judged on the data as it is at that moment.
 */

const MANIFEST = "_demo_sales";
const manifestColl = () =>
  mongoose.connection.db!.collection<{ _id: string } & Record<string, unknown>>(MANIFEST);
const DEMO_DOMAIN = "demo.teleshop.local";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const COLOMBO = 5.5 * HOUR;

// ---------- deterministic randomness ----------
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
const between = (r: Rand, lo: number, hi: number): number => lo + r() * (hi - lo);
const int = (r: Rand, lo: number, hi: number): number => Math.floor(between(r, lo, hi + 1));
function weighted<T>(r: Rand, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[items.length - 1]![0];
}
const digits = (r: Rand, n: number): string => Array.from({ length: n }, () => int(r, 0, 9)).join("");

function luhnDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let d = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}
/** 15-digit IMEI with a valid Luhn check digit (passes the seller form's IMEI check). */
const imei = (r: Rand): string => {
  const body = `35${digits(r, 12)}`;
  return body + luhnDigit(body);
};
const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const serial = (r: Rand): string =>
  pick(r, ["C02", "5CD", "PF3", "R9N"]) + Array.from({ length: 9 }, () => pick(r, [...ALNUM])).join("");

/** Tracking codes in each courier's own format; null if we don't know the courier. */
function trackingCode(r: Rand, courier: string): string | null {
  switch (courier) {
    case "Prompt Xpress":
      return `PX-${digits(r, 4)} ${digits(r, 4)} LK`;
    case "Domex":
      return `DX${digits(r, 9)}`;
    case "Koombiyo":
      return `KB${digits(r, 8)}`;
    case "Pronto":
      return `PR${Array.from({ length: 10 }, () => pick(r, [...ALNUM])).join("")}`;
    case "Citypak":
      return `CP${digits(r, 10)}`;
    default:
      return null;
  }
}

// ---------- people and places ----------
const FIRST = [
  "Nimal",
  "Kasun",
  "Tharindu",
  "Dilani",
  "Sanduni",
  "Chamari",
  "Ishara",
  "Nuwan",
  "Ruwan",
  "Supun",
  "Hasini",
  "Malsha",
  "Pradeep",
  "Lahiru",
  "Dinithi",
  "Sachini",
  "Kavindu",
  "Janith",
  "Thilini",
  "Ayesha",
  "Arun",
  "Priya",
  "Karthik",
  "Vithya",
  "Suresh",
  "Nirosha",
  "Fathima",
  "Rizwan",
  "Ashraf",
  "Shifna",
  "Chathura",
  "Heshan",
  "Madushan",
  "Gayani",
  "Oshadi",
  "Sahan",
  "Yasiru",
  "Imesha",
  "Dulaj",
  "Ravindu",
] as const;
const LAST = [
  "Perera",
  "Fernando",
  "Silva",
  "Jayasinghe",
  "Wickramasinghe",
  "Bandara",
  "Herath",
  "Rajapaksha",
  "Gunawardena",
  "Dissanayake",
  "Kumara",
  "Senanayake",
  "Ranasinghe",
  "Abeysekara",
  "Weerasinghe",
  "Pathirana",
  "Sivakumar",
  "Rajendran",
  "Selvaraj",
  "Mohamed",
  "Fazal",
  "Cassim",
  "Ekanayake",
  "Liyanage",
] as const;
const CITIES: readonly (readonly [(typeof districts)[number], readonly string[], number])[] = [
  ["Colombo", ["Colombo 03", "Dehiwala", "Maharagama", "Nugegoda", "Kottawa", "Battaramulla"], 30],
  ["Gampaha", ["Negombo", "Kadawatha", "Gampaha", "Wattala", "Ja-Ela", "Kiribathgoda"], 18],
  ["Kandy", ["Kandy", "Peradeniya", "Katugastota", "Kundasale"], 10],
  ["Kalutara", ["Panadura", "Kalutara", "Horana"], 7],
  ["Galle", ["Galle", "Hikkaduwa", "Ambalangoda"], 6],
  ["Kurunegala", ["Kurunegala", "Kuliyapitiya"], 6],
  ["Matara", ["Matara", "Weligama"], 4],
  ["Jaffna", ["Jaffna", "Chavakachcheri"], 3],
  ["Ratnapura", ["Ratnapura", "Balangoda"], 3],
  ["Anuradhapura", ["Anuradhapura"], 3],
  ["Badulla", ["Badulla", "Bandarawela"], 2],
  ["Puttalam", ["Chilaw", "Puttalam"], 2],
  ["Trincomalee", ["Trincomalee"], 2],
  ["Batticaloa", ["Batticaloa"], 1],
  ["Kegalle", ["Kegalle", "Mawanella"], 2],
  ["Hambantota", ["Tangalle", "Hambantota"], 1],
  ["Matale", ["Matale", "Dambulla"], 1],
  ["Nuwara Eliya", ["Nuwara Eliya", "Hatton"], 1],
];
const STREETS = [
  "Temple Road",
  "Galle Road",
  "Station Road",
  "Kandy Road",
  "Lake Drive",
  "Hospital Road",
  "Main Street",
  "School Lane",
  "Flower Road",
  "Church Road",
  "Park Avenue",
  "High Level Road",
  "Negombo Road",
] as const;

// ---------- reviews ----------
type Kind = "phone" | "laptop" | "audio" | "wearable" | "pc" | "other";
const kindOf = (categorySlug: string): Kind =>
  categorySlug === "mobile-phones"
    ? "phone"
    : categorySlug === "laptops"
      ? "laptop"
      : categorySlug === "audio"
        ? "audio"
        : categorySlug === "wearables"
          ? "wearable"
          : categorySlug === "pc-components" || categorySlug === "gaming"
            ? "pc"
            : "other";
const GOOD: Record<Kind, readonly (readonly [string, string])[]> = {
  phone: [
    [
      "Genuine unit, fast delivery",
      "Brand new sealed box and the IMEI matched the box. Courier came the next day and I paid cash on delivery.",
    ],
    ["Excellent phone", "Camera is amazing even at night. Battery easily lasts a full day of heavy use."],
    ["Worth every rupee", "Compared prices in three shops and this was the best deal, with full warranty."],
    ["Smooth purchase", "The shop called to confirm the colour before shipping. Very professional."],
    ["Happy with it", "Display is super bright and the phone feels premium. Delivered well packed."],
    [
      "Best upgrade so far",
      "Moved from a three year old phone and the difference is huge. Charging is very fast.",
    ],
    ["Trusted seller", "Second phone I bought from this shop. Always genuine and on time."],
    ["Good deal", "Got it during the sale, saved a lot compared to other shops."],
  ],
  laptop: [
    [
      "Great laptop for work",
      "Fast, quiet and the battery lasts through my workday. Arrived with the warranty card.",
    ],
    ["Perfect for university", "Light enough to carry around campus. Setup took ten minutes."],
    ["Powerful machine", "Handles my editing work without any lag. Packing was very secure."],
    ["Good value", "Same model was more expensive in Colombo shops. Delivery to Kandy took two days."],
  ],
  audio: [
    ["Great sound", "Clear sound and deep bass. Noise cancelling works well on the bus."],
    ["Comfortable", "I can wear them for hours. Connects instantly to my phone."],
    ["Original product", "Checked the serial with the brand website, it is genuine."],
    ["Perfect for the gym", "They stay in place while running and the case charges quickly."],
    ["Clear calls", "People say my voice is very clear on calls, even on a busy road."],
  ],
  wearable: [
    ["Love it", "Tracks my runs and sleep accurately. Strap is comfortable."],
    ["Nice watch", "Battery lasts almost a week. Notifications work perfectly."],
  ],
  pc: [
    ["Exactly as described", "Works perfectly in my build. Temperatures are great."],
    ["Good upgrade", "Noticeable performance jump. Shop answered my compatibility questions quickly."],
    ["Fast delivery", "Ordered on Monday, installed on Wednesday. Well packed."],
    ["Runs cool and quiet", "Even under load it stays quiet. Very happy with the build."],
    ["Smooth gaming", "Frame rates went way up after this upgrade."],
  ],
  other: [
    ["Does the job", "Works as expected and was delivered quickly."],
    ["Recommended", "Good quality for the price. Paid the courier in cash, no hassle."],
    ["Good product", "Simple setup and solid build quality."],
    ["Sharp and bright", "Colours look accurate out of the box and there were no dead pixels."],
    ["Great for my home office", "Plugged it into my laptop with one cable and it just worked."],
    ["Strong signal", "Covers the whole house now, even the upstairs rooms. Setup through the app was easy."],
    ["Solid build", "Feels well made and the shop packed it very carefully."],
    ["Quick delivery to Galle", "Arrived in two days, exactly as shown in the photos."],
    ["Value for money", "Cheaper than the big stores and it came with the full warranty."],
  ],
};
const MIXED = [
  ["Good, but delivery was slow", "Product is fine but it took four days to reach Jaffna."],
  ["Okay", "Does what it says. The box was a little dented but the item was fine."],
  ["Decent", "Good product, though I expected slightly better battery life."],
] as const;
const BAD = [
  ["Not happy with delivery", "Courier rescheduled twice. The product itself works."],
  ["Expected more", "Works, but not as good as the reviews made me think."],
] as const;
const REPLIES = [
  "Thank you for shopping with us! Enjoy your new device.",
  "Thanks for the kind words — see you again soon.",
  "Sorry about the delay. We have spoken to the courier about this area.",
  "Thank you for the feedback. Please call us if you need any help with setup.",
] as const;

// ---------- types ----------
type ProductPick = {
  id: Types.ObjectId;
  sellerId: Types.ObjectId;
  name: string;
  shortName: string;
  kind: Kind;
  categorySlug: string;
  requiresSerial: boolean;
  freeDelivery: boolean;
  warrantyMonths: number;
  imageUrl: string | null;
  variants: { sku: string; label: string; priceCents: number }[];
};
/** products / sellers as raw collections, for the rating cache only (one code path for both). */
const ratingColl = (kind: "product" | "seller") =>
  mongoose.connection.db!.collection<{ _id: Types.ObjectId; rating?: { average?: number; count?: number } }>(
    kind === "product" ? "products" : "sellers",
  );
type RatingSnap = { kind: "product" | "seller"; id: string; average: number; count: number };
type Courier = { id: Types.ObjectId; name: string; template: string };
type Ids = Record<
  "users" | "orders" | "orderEvents" | "payments" | "reviews" | "payouts" | "auditLogs",
  Types.ObjectId[]
>;
export type DemoSalesResult = { counts: Record<string, number>; window: { from: Date; to: Date } };

const colomboMonthStart = (d: Date): Date => {
  const local = new Date(d.getTime() + COLOMBO);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - COLOMBO);
};
const nextMonth = (d: Date): Date => {
  const local = new Date(d.getTime() + COLOMBO);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - COLOMBO);
};
/** Shift a time into the day-time hours people shop (08:00–23:00 Colombo). */
function shopHours(r: Rand, t: number): Date {
  const local = new Date(t + COLOMBO);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const hour = weighted(r, [
    [9, 2],
    [11, 3],
    [13, 3],
    [15, 2],
    [18, 3],
    [20, 4],
    [22, 2],
  ] as const);
  return new Date(day - COLOMBO + hour * HOUR + int(r, 0, 119) * 60_000);
}

async function validated<
  T extends { validate: () => Promise<void>; toObject: () => Record<string, unknown> },
>(doc: T, extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  await doc.validate();
  return { ...doc.toObject(), ...extra };
}

export async function demoSalesExist(): Promise<boolean> {
  return (await mongoose.connection.db!.collection(MANIFEST).countDocuments()) > 0;
}

export async function seedDemoSales(opts: { now?: Date; seed?: number } = {}): Promise<DemoSalesResult> {
  const db = mongoose.connection.db!;
  if (await demoSalesExist()) throw new Error("Demo sales already exist. Run with --remove first.");
  const r = prng(opts.seed ?? 20261112);
  const now = opts.now ?? new Date();

  // ---------- what the store has ----------
  const settings = (await SettingsModel.findById("global").lean<{
    deliveryFeeCents: number;
    expressFeeCents: number;
    platformFeeBp: number;
  }>()) ?? { deliveryFeeCents: 45000, expressFeeCents: 95000, platformFeeBp: 300 };
  const admin = await UserModel.findOne({ role: "admin" }).select("_id").lean<{ _id: Types.ObjectId }>();
  if (!admin) throw new Error("No admin user — seed the store first.");

  const sellers = await SellerModel.find({ approvalStatus: "approved" })
    .select("shopName payoutAccount userId")
    .lean<
      {
        _id: Types.ObjectId;
        shopName: string;
        userId: Types.ObjectId;
        payoutAccount?: { last4?: string } | null;
      }[]
    >();
  const shopName = new Map(sellers.map((s) => [s._id.toString(), s.shopName]));
  const cats = await CategoryModel.find()
    .select("slug requiresSerial")
    .lean<{ _id: Types.ObjectId; slug: string; requiresSerial?: boolean }[]>();
  const catById = new Map(cats.map((c) => [c._id.toString(), c]));
  const rawProducts = await ProductModel.find({
    status: "published",
    sellerId: $in(sellers.map((s) => s._id)),
  })
    .select("sellerId categoryId name shortName freeDelivery warranty images variants")
    .lean<
      {
        _id: Types.ObjectId;
        sellerId: Types.ObjectId;
        categoryId: Types.ObjectId;
        name: string;
        shortName: string;
        freeDelivery?: boolean;
        warranty?: { months?: number };
        images?: { url: string }[];
        variants: { sku: string; label: string; priceCents: number; isActive?: boolean }[];
      }[]
    >();
  const products: ProductPick[] = rawProducts
    .map((p) => {
      const cat = catById.get(p.categoryId.toString());
      return {
        id: p._id,
        sellerId: p.sellerId,
        name: p.name.split(" · ")[0] ?? p.name,
        shortName: p.shortName,
        kind: kindOf(cat?.slug ?? ""),
        categorySlug: cat?.slug ?? "",
        requiresSerial: cat?.requiresSerial ?? false,
        freeDelivery: p.freeDelivery ?? false,
        warrantyMonths: p.warranty?.months ?? 0,
        imageUrl: p.images?.[0]?.url ?? null,
        variants: p.variants.filter((v) => v.isActive !== false),
      };
    })
    .filter((p) => p.variants.length > 0);
  if (products.length < 5) throw new Error("Need at least 5 published products from approved shops.");

  const couriers: Courier[] = (
    await CourierModel.find({ isActive: true })
      .select("name codePattern trackingUrlTemplate")
      .lean<{ _id: Types.ObjectId; name: string; codePattern: string; trackingUrlTemplate: string }[]>()
  )
    .filter((c) => {
      const code = trackingCode(prng(1), c.name);
      // eslint-disable-next-line security/detect-non-literal-regexp -- admin-maintained courier pattern
      return code !== null && new RegExp(c.codePattern).test(code);
    })
    .map((c) => ({ id: c._id, name: c.name, template: c.trackingUrlTemplate }));
  if (!couriers.length) throw new Error("No active courier with a known code format.");

  // ---------- time windows and order numbers ----------
  const existing = await OrderModel.find()
    .select("orderNo placedAt")
    .lean<{ orderNo: string; placedAt: Date }[]>();
  const seqOf = (no: string): number => Number(no.slice(-6));
  const firstExisting = existing.reduce<{ orderNo: string; placedAt: Date } | null>(
    (a, o) => (!a || o.placedAt < a.placedAt ? o : a),
    null,
  );
  const lastExisting = existing.reduce<Date | null>((a, o) => (!a || o.placedAt > a ? o.placedAt : a), null);
  const historyEnd = firstExisting ? firstExisting.placedAt.getTime() - DAY : now.getTime() - 14 * DAY;
  const freeBelow = firstExisting ? seqOf(firstExisting.orderNo) - 1 : 0;
  const historyCount = Math.min(freeBelow, 122);
  const historyStart = historyEnd - 150 * DAY;
  const recentStart = Math.max(lastExisting?.getTime() ?? historyEnd, historyEnd) + 12 * HOUR;
  const recentEnd = now.getTime() - 20 * 60_000;
  const recentCount = Math.max(0, Math.round(((recentEnd - recentStart) / DAY) * 2.7));

  // Growth: density rises over time (sqrt of a uniform draw).
  const times = (from: number, to: number, n: number): number[] =>
    Array.from({ length: n }, () => from + (to - from) * Math.sqrt(r()))
      .map((t) => shopHours(r, t).getTime())
      .filter((t) => t >= from && t <= to)
      .sort((a, b) => a - b);
  const history = times(historyStart, historyEnd, historyCount);
  const taken = new Set(existing.map((o) => o.orderNo));
  const historyYear = new Date(historyEnd + COLOMBO).getUTCFullYear();
  for (let n = 1; n <= history.length; n++) {
    if (taken.has(`TS-${historyYear}-${String(n).padStart(6, "0")}`))
      throw new Error("Order numbers below the first order are taken.");
  }
  const recent = times(recentStart, recentEnd, recentCount);

  // ---------- customers ----------
  const customerCount = Math.max(12, Math.round((history.length + recent.length) * 0.55));
  const customers = Array.from({ length: customerCount }, (_, i) => {
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const [district, cities] = weighted(
      r,
      CITIES.map(([d, c, w]) => [[d, c] as const, w] as const),
    );
    return {
      _id: new Types.ObjectId(),
      name: `${first} ${last}`,
      email: `${first}.${last}.${i + 1}@${DEMO_DOMAIN}`.toLowerCase(),
      phone: `+947${pick(r, ["0", "1", "2", "4", "5", "6", "7", "8"])}${digits(r, 7)}`,
      address: {
        recipientName: `${first} ${last}`,
        line1: `No. ${int(r, 1, 240)}, ${pick(r, STREETS)}`,
        line2: "",
        city: pick(r, cities),
        district,
        postalCode: null,
      },
      firstOrder: Number.POSITIVE_INFINITY,
      lastOrder: 0,
    };
  });
  // A few loyal customers come back; most buy once or twice.
  const customerFor = (): (typeof customers)[number] =>
    r() < 0.3 ? customers[int(r, 0, Math.min(9, customers.length - 1))]! : pick(r, customers);

  // ---------- build orders ----------
  const ids: Ids = {
    users: [],
    orders: [],
    orderEvents: [],
    payments: [],
    reviews: [],
    payouts: [],
    auditLogs: [],
  };
  const orderDocs: Record<string, unknown>[] = [];
  const eventDocs: Record<string, unknown>[] = [];
  const paymentDocs: Record<string, unknown>[] = [];
  const reviewDocs: { doc: Record<string, unknown>; productId: string; sellerId: string; rating: number }[] =
    [];
  const auditDocs: Record<string, unknown>[] = [];
  const reservations = new Map<string, number>();
  const collectedBySeller = new Map<
    string,
    { at: Date; itemsCents: number; deliveryCents: number; orderNo: string }[]
  >();
  const counterTop = new Map<string, number>();
  const reviewedBy = new Set<string>();
  const titlesOn = new Map<string, Set<string>>();

  const byKind = (k: Kind[]): ProductPick[] => products.filter((p) => k.includes(p.kind));
  const pool = {
    main: products,
    addOn: byKind(["audio", "wearable", "other"]).filter((p) => (p.variants[0]?.priceCents ?? 0) < 4_000_000),
  };
  const firstPick = (): ProductPick => {
    const kind = weighted<Kind>(r, [
      ["phone", 30],
      ["audio", 18],
      ["laptop", 12],
      ["pc", 16],
      ["wearable", 10],
      ["other", 14],
    ]);
    const list = byKind([kind]);
    return list.length ? pick(r, list) : pick(r, pool.main);
  };

  const allTimes = [...history.map((t, i) => ({ t, no: i + 1 })), ...recent.map((t) => ({ t, no: 0 }))];
  for (const { t, no } of allTimes) {
    const placedAt = new Date(t);
    const year = new Date(t + COLOMBO).getUTCFullYear();
    let seq = no;
    if (!seq) {
      const c = await CounterModel.findOneAndUpdate(
        { _id: `order:${year}` },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
      ).lean<{ seq: number }>();
      seq = c!.seq;
      counterTop.set(`order:${year}`, seq);
    }
    const orderNo = `TS-${year}-${String(seq).padStart(6, "0")}`;
    const customer = customerFor();
    customer.firstOrder = Math.min(customer.firstOrder, t);
    customer.lastOrder = Math.max(customer.lastOrder, t);
    const express = r() < 0.18;

    // Lines: a main product, sometimes an accessory (often from another shop → two packages).
    const lines: { p: ProductPick; v: ProductPick["variants"][number]; qty: number }[] = [];
    const main = firstPick();
    lines.push({ p: main, v: pick(r, main.variants), qty: main.kind === "other" && r() < 0.2 ? 2 : 1 });
    if (r() < 0.22 && pool.addOn.length) {
      const extra = pick(
        r,
        pool.addOn.filter((p) => !p.id.equals(main.id)),
      );
      if (extra) lines.push({ p: extra, v: pick(r, extra.variants), qty: 1 });
    }
    const groups = new Map<string, typeof lines>();
    for (const l of lines)
      groups.set(l.p.sellerId.toString(), [...(groups.get(l.p.sellerId.toString()) ?? []), l]);

    const orderId = new Types.ObjectId();
    const scenario = weighted(r, [
      ["normal", 89],
      ["customer_cancel", 4],
      ["shop_cancel", 3],
      ["auto_cancel", 1.5],
      ["returned", 2.5],
    ] as const);
    const events: Record<string, unknown>[] = [];
    const ev = (
      packageId: Types.ObjectId | null,
      from: string | null,
      to: string,
      at: Date,
      note: string,
      role: "customer" | "seller" | "admin" | "system",
      actorId: Types.ObjectId | null,
    ): void => {
      events.push({
        orderId,
        packageId,
        fromStatus: from,
        toStatus: to,
        actorRole: role,
        actorId,
        note,
        createdAt: at,
      });
    };
    ev(null, null, "pending", placedAt, "Order placed — Cash on Delivery", "customer", customer._id);

    let cancelledAt: Date | null = null;
    let cancelReason: string | null = null;
    const perPackage: {
      packageId: Types.ObjectId;
      amountCents: number;
      status: string;
      collectedAt: Date | null;
    }[] = [];
    const packages = [...groups.entries()].map(([sellerId, pkgLines]) => {
      const packageId = new Types.ObjectId();
      const shop = shopName.get(sellerId) ?? "The shop";
      const sellerUser = sellers.find((s) => s._id.toString() === sellerId)?.userId ?? null;
      const items = pkgLines.map((l) => ({
        _id: new Types.ObjectId(),
        productId: l.p.id,
        sku: l.v.sku,
        name: l.p.name,
        variantLabel: l.v.label,
        imageUrl: l.p.imageUrl,
        unitPriceCents: l.v.priceCents,
        qty: l.qty,
        lineTotalCents: l.v.priceCents * l.qty,
        warrantyMonths: l.p.warrantyMonths,
        serialNumbers: [] as string[],
        kind: l.p.kind,
        requiresSerial: l.p.requiresSerial,
      }));
      const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);
      const allFree = pkgLines.every((l) => l.p.freeDelivery);
      const deliveryCents = express ? settings.expressFeeCents : allFree ? 0 : settings.deliveryFeeCents;

      // Walk the package through its life until "now".
      let status = "pending" as PackageStatus;
      let at = placedAt.getTime();
      let shipment: Record<string, unknown> | null = null;
      let collectedAt: Date | null = null;
      const step = (hoursLo: number, hoursHi: number): boolean => {
        const next = at + between(r, hoursLo, hoursHi) * HOUR;
        if (next > now.getTime()) return false;
        at = next;
        return true;
      };
      const move = (
        to: PackageStatus,
        note: string,
        role: "customer" | "seller" | "admin" | "system",
        actor: Types.ObjectId | null,
      ): void => {
        ev(packageId, status, to, new Date(at), note, role, actor);
        status = to;
      };

      if (scenario === "customer_cancel") {
        if (step(0.3, 6)) {
          const reason = pick(r, [
            "I changed my mind",
            "I ordered by mistake",
            "I found it cheaper elsewhere",
          ]);
          move("cancelled", `Cancelled by the customer: ${reason}`, "customer", customer._id);
          cancelledAt = new Date(at);
          cancelReason = reason;
        }
      } else if (scenario === "shop_cancel") {
        if (step(1, 10)) {
          const reason = pick(r, [
            "The item is out of stock",
            "The item is out of stock",
            "We can't deliver to this area",
          ]);
          move("cancelled", `Cancelled by ${shop}: ${reason}`, "seller", sellerUser);
          cancelledAt = new Date(at);
          cancelReason = `Cancelled by ${shop}: ${reason}`;
        }
      } else if (scenario === "auto_cancel") {
        if (step(48, 50)) {
          move("cancelled", "Not accepted by the shop within 48 hours", "system", null);
          cancelledAt = new Date(at);
          cancelReason = "Not accepted by the shop within 48 hours";
        }
      } else if (step(0.5, express ? 3 : 10)) {
        move("confirmed", `Accepted by ${shop}`, "seller", sellerUser);
        if (step(4, 26)) {
          move("processing", `${shop} is packing your items`, "seller", sellerUser);
          for (const i of items) {
            if (i.requiresSerial)
              i.serialNumbers = Array.from({ length: i.qty }, () =>
                i.kind === "phone" ? imei(r) : serial(r),
              );
          }
          if (step(1, 8)) {
            move("ready_to_ship", "Packed and ready for courier pickup", "seller", sellerUser);
            if (step(express ? 2 : 4, express ? 8 : 26)) {
              const courier = pick(r, couriers);
              const code = trackingCode(r, courier.name)!;
              const handedOverAt = new Date(at);
              const addedAt = new Date(Math.min(at + between(r, 0.2, 3) * HOUR, now.getTime()));
              shipment = {
                courierId: courier.id,
                courierName: courier.name,
                trackingCode: code,
                trackingUrl: buildTrackingUrl(courier.template, code),
                handedOverAt,
                estimatedDelivery: new Date(at + (express ? 1 : 3) * DAY),
                addedBy: admin._id,
                addedAt,
              };
              move("shipped", `Handed to ${courier.name} · ${code}`, "admin", admin._id);
              auditDocs.push({
                actorId: admin._id,
                actorRole: "admin",
                action: "order.tracking.add",
                entity: "order",
                entityId: orderNo,
                data: { packageId: packageId.toString(), courier: courier.name, trackingCode: code },
                ipHash: null,
                createdAt: addedAt,
              });
              if (step(express ? 14 : 24, express ? 40 : 100)) {
                if (scenario === "returned") {
                  const note = pick(r, ["Customer refused the parcel", "Customer could not be reached"]);
                  move("returned", `Returned to the shop: ${note}`, "admin", admin._id);
                  auditDocs.push({
                    actorId: admin._id,
                    actorRole: "admin",
                    action: "order.package.returned",
                    entity: "order",
                    entityId: orderNo,
                    data: { packageId: packageId.toString(), note },
                    ipHash: null,
                    createdAt: new Date(at),
                  });
                } else {
                  move("delivered", "Delivered — Cash on Delivery collected", "admin", admin._id);
                  collectedAt = new Date(at);
                  auditDocs.push({
                    actorId: admin._id,
                    actorRole: "admin",
                    action: "payment.cod.collected",
                    entity: "order",
                    entityId: orderNo,
                    data: { packageId: packageId.toString() },
                    ipHash: null,
                    createdAt: collectedAt,
                  });
                }
              }
            }
          }
        }
      }

      // Packages still on their way hold stock, like a real checkout.
      if (!["delivered", "cancelled", "returned"].includes(status)) {
        for (const i of items) reservations.set(i.sku, (reservations.get(i.sku) ?? 0) + i.qty);
      }
      perPackage.push({
        packageId,
        amountCents: subtotalCents + deliveryCents,
        status:
          status === "delivered"
            ? "paid"
            : status === "cancelled" || status === "returned"
              ? "failed"
              : "pending",
        collectedAt,
      });
      if (collectedAt) {
        const list = collectedBySeller.get(sellerId) ?? [];
        list.push({ at: collectedAt, itemsCents: subtotalCents, deliveryCents, orderNo });
        collectedBySeller.set(sellerId, list);
      }

      // Reviews: about half of the delivered items, a few days after delivery.
      if (collectedAt) {
        for (const i of items) {
          if (r() > 0.5) continue;
          // One review per customer per product, and no repeated headline on a product page.
          const reviewKey = `${customer._id.toString()}:${i.productId.toString()}`;
          if (reviewedBy.has(reviewKey)) continue;
          reviewedBy.add(reviewKey);
          const reviewAt = collectedAt.getTime() + between(r, 1, 12) * DAY;
          if (reviewAt > now.getTime()) continue;
          const rating = weighted(r, [
            [5, 60],
            [4, 27],
            [3, 8],
            [2, 3.5],
            [1, 1.5],
          ] as const);
          const options: readonly (readonly [string, string])[] =
            rating >= 4 ? GOOD[i.kind] : rating === 3 ? MIXED : BAD;
          const used = titlesOn.get(i.productId.toString()) ?? new Set<string>();
          const fresh = options.filter(([t]) => !used.has(t));
          if (!fresh.length) continue;
          const [title, comment] = pick(r, fresh);
          used.add(title);
          titlesOn.set(i.productId.toString(), used);
          const replyChance = rating <= 3 ? 0.7 : 0.25;
          reviewDocs.push({
            productId: i.productId.toString(),
            sellerId,
            rating,
            doc: {
              productId: i.productId,
              sellerId: new Types.ObjectId(sellerId),
              customerId: customer._id,
              orderId,
              itemId: i._id,
              rating,
              title,
              comment,
              status: "visible",
              sellerReply: r() < replyChance ? pick(r, REPLIES) : null,
              createdAt: new Date(reviewAt),
              updatedAt: new Date(reviewAt),
            },
          });
        }
      }
      return {
        _id: packageId,
        sellerId: new Types.ObjectId(sellerId),
        status,
        items: items.map(({ kind: _k, requiresSerial: _s, ...rest }) => rest),
        subtotalCents,
        deliveryCents,
        shipment,
      };
    });

    const subtotalCents = packages.reduce((n, p) => n + p.subtotalCents, 0);
    const deliveryCents = packages.reduce((n, p) => n + p.deliveryCents, 0);
    const status = deriveOrderStatus(packages.map((p) => p.status));
    const lastEvent = events.reduce(
      (a, e) => ((e.createdAt as Date) > a ? (e.createdAt as Date) : a),
      placedAt,
    );
    orderDocs.push(
      await validated(
        new OrderModel({
          _id: orderId,
          orderNo,
          customerId: customer._id,
          idempotencyKey: `demo-${orderNo}`,
          deliveryAddress: { ...customer.address, phone: customer.phone },
          deliveryMethod: express ? "express" : "standard",
          subtotalCents,
          deliveryCents,
          totalCents: subtotalCents + deliveryCents,
          status,
          packages,
          placedAt,
          cancelledAt: status === "cancelled" ? cancelledAt : null,
          cancelReason: status === "cancelled" ? cancelReason : null,
        }),
        { createdAt: placedAt, updatedAt: lastEvent },
      ),
    );
    const live = perPackage.filter((p) => p.status !== "failed");
    const overall =
      live.length === 0 ? "failed" : live.every((p) => p.status === "paid") ? "paid" : "pending";
    const paidAt =
      overall === "paid"
        ? live.reduce<Date | null>(
            (a, p) => (!a || (p.collectedAt && p.collectedAt > a) ? p.collectedAt : a),
            null,
          )
        : null;
    paymentDocs.push(
      await validated(
        new PaymentModel({
          orderId,
          amountCents: subtotalCents + deliveryCents,
          perPackage,
          status: overall,
          paidAt,
        }),
        { createdAt: placedAt, updatedAt: lastEvent },
      ),
    );
    for (const e of events) {
      const { createdAt, ...rest } = e;
      eventDocs.push(await validated(new OrderEventModel(rest), { createdAt }));
    }
  }

  // ---------- users (created a little before their first order) ----------
  const userDocs: Record<string, unknown>[] = [];
  for (const c of customers.filter((x) => x.lastOrder > 0)) {
    const created = new Date(c.firstOrder - between(r, 0.02, 20) * DAY);
    userDocs.push(
      await validated(
        new UserModel({
          _id: c._id,
          email: c.email,
          name: c.name,
          phone: c.phone,
          emailVerified: new Date(created.getTime() + int(r, 2, 40) * 60_000),
          role: "customer",
          lastLoginAt: new Date(c.lastOrder),
        }),
        { createdAt: created, updatedAt: new Date(c.lastOrder) },
      ),
    );
  }

  // ---------- payouts: one per shop per finished month, paid early the next month ----------
  const bankPatched: string[] = [];
  const payoutDocs: Record<string, unknown>[] = [];
  const thisMonth = colomboMonthStart(now);
  for (const s of sellers) {
    const collected = collectedBySeller.get(s._id.toString()) ?? [];
    if (!collected.length || (await PayoutModel.countDocuments({ sellerId: s._id })) > 0) continue;
    if (!s.payoutAccount?.last4) bankPatched.push(s._id.toString());
    let start = colomboMonthStart(collected.reduce((a, c) => (c.at < a ? c.at : a), collected[0]!.at));
    while (start < thisMonth) {
      const end = nextMonth(start);
      const inMonth = collected.filter((c) => c.at >= start && c.at < end);
      if (inMonth.length) {
        const items = inMonth.reduce((n, c) => n + c.itemsCents, 0);
        const gross = items + inMonth.reduce((n, c) => n + c.deliveryCents, 0);
        const fee = platformFee(items, settings.platformFeeBp);
        const scheduledAt = new Date(end.getTime() + int(r, 1, 2) * DAY + 10 * HOUR);
        const paidAt = new Date(scheduledAt.getTime() + int(r, 1, 3) * DAY);
        const local = new Date(paidAt.getTime() + COLOMBO);
        const reference = `SLIPS-${local.toISOString().slice(0, 10).replace(/-/g, "")}-${digits(r, 4)}`;
        const id = new Types.ObjectId();
        payoutDocs.push(
          await validated(
            new PayoutModel({
              _id: id,
              sellerId: s._id,
              periodStart: start,
              periodEnd: end,
              orderCount: new Set(inMonth.map((c) => c.orderNo)).size,
              grossCents: gross,
              feeCents: fee,
              netCents: gross - fee,
              status: "paid",
              paidAt,
              reference,
            }),
            { createdAt: scheduledAt, updatedAt: paidAt },
          ),
        );
        auditDocs.push({
          actorId: admin._id,
          actorRole: "admin",
          action: "payout.scheduled",
          entity: "payout",
          entityId: id.toString(),
          data: { sellerId: s._id.toString(), netCents: gross - fee },
          ipHash: null,
          createdAt: scheduledAt,
        });
        auditDocs.push({
          actorId: admin._id,
          actorRole: "admin",
          action: "payout.paid",
          entity: "payout",
          entityId: id.toString(),
          data: { reference },
          ipHash: null,
          createdAt: paidAt,
        });
      }
      start = end;
    }
  }
  const auditValidated: Record<string, unknown>[] = [];
  for (const a of auditDocs) {
    const { createdAt, ...rest } = a;
    auditValidated.push(await validated(new AuditLogModel(rest), { createdAt }));
  }

  // ---------- write ----------
  const insert = async (coll: string, docs: Record<string, unknown>[], key: keyof Ids): Promise<void> => {
    for (let i = 0; i < docs.length; i += 500) await db.collection(coll).insertMany(docs.slice(i, i + 500));
    ids[key] = docs.map((d) => d._id as Types.ObjectId);
  };
  await manifestColl().insertOne({ _id: "manifest", createdAt: now, complete: false, bankPatched });
  await insert(UserModel.collection.collectionName, userDocs, "users");
  await insert(OrderModel.collection.collectionName, orderDocs, "orders");
  await insert(PaymentModel.collection.collectionName, paymentDocs, "payments");
  await insert(OrderEventModel.collection.collectionName, eventDocs, "orderEvents");
  await insert(PayoutModel.collection.collectionName, payoutDocs, "payouts");
  await insert(AuditLogModel.collection.collectionName, auditValidated, "auditLogs");
  const reviews: Record<string, unknown>[] = [];
  for (const x of reviewDocs)
    reviews.push(
      await validated(new ReviewModel(x.doc), { createdAt: x.doc.createdAt, updatedAt: x.doc.updatedAt }),
    );
  await insert(ReviewModel.collection.collectionName, reviews, "reviews");
  await manifestColl().updateOne({ _id: "manifest" }, { $set: { ids } });

  // Ratings are rounded on every change, so removal restores these exact values (see removeDemoSales).
  const ratingsOf = async (): Promise<RatingSnap[]> => {
    const productIds = [...new Set(reviewDocs.map((x) => x.productId))].map((id) => new Types.ObjectId(id));
    const sellerIds = [...new Set(reviewDocs.map((x) => x.sellerId))].map((id) => new Types.ObjectId(id));
    const read = async (kind: RatingSnap["kind"], list: Types.ObjectId[]): Promise<RatingSnap[]> =>
      (
        await ratingColl(kind)
          .find({ _id: { $in: list } }, { projection: { rating: 1 } })
          .toArray()
      ).map((d) => ({
        kind,
        id: d._id.toString(),
        average: d.rating?.average ?? 0,
        count: d.rating?.count ?? 0,
      }));
    return [...(await read("product", productIds)), ...(await read("seller", sellerIds))];
  };
  const ratingsBefore = await ratingsOf();
  const session: ClientSession = await mongoose.startSession();
  try {
    for (const x of reviewDocs) await addRatingToCaches(x.productId, x.sellerId, x.rating, session);
  } finally {
    await session.endSession();
  }
  await manifestColl().updateOne(
    { _id: "manifest" },
    { $set: { ratingsBefore, ratingsAfter: await ratingsOf() } },
  );
  for (const [sku, qty] of reservations) {
    const res = await InventoryModel.updateOne(
      { sku, available: $gte(qty) },
      { $inc: { reserved: qty, available: -qty } },
    );
    // Not enough on sale: the shop restocked for this order.
    if (res.matchedCount === 0)
      await InventoryModel.updateOne({ sku }, { $inc: { onHand: qty, reserved: qty } });
  }
  const banks = [
    "Bank of Ceylon",
    "Commercial Bank",
    "Sampath Bank",
    "Hatton National Bank",
    "People's Bank",
  ];
  for (const id of bankPatched) {
    await SellerModel.updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          payoutAccount: {
            bank: pick(r, banks),
            branch: pick(r, ["Colombo Fort", "Kandy", "Nugegoda", "Galle"]),
            last4: digits(r, 4),
          },
        },
      },
    );
  }
  await manifestColl().updateOne(
    { _id: "manifest" },
    { $set: { complete: true, counterTop: Object.fromEntries(counterTop) } },
  );

  return {
    counts: {
      customers: userDocs.length,
      orders: orderDocs.length,
      delivered: orderDocs.filter((o) => o.status === "delivered").length,
      open: orderDocs.filter((o) => !["delivered", "cancelled"].includes(o.status as string)).length,
      cancelled: orderDocs.filter((o) => o.status === "cancelled").length,
      reviews: reviews.length,
      payouts: payoutDocs.length,
      auditLogs: auditValidated.length,
      reservedSkus: reservations.size,
    },
    window: { from: new Date(historyStart), to: now },
  };
}

/** Undoes `seedDemoSales()` using its manifest and the data as it is now. */
export async function removeDemoSales(): Promise<Record<string, number>> {
  const db = mongoose.connection.db!;
  const m = (await manifestColl().findOne({ _id: "manifest" })) as {
    ids?: Ids;
    bankPatched?: string[];
    ratingsBefore?: RatingSnap[];
    ratingsAfter?: RatingSnap[];
  } | null;
  if (!m) return {};
  const ids = m.ids ?? {
    users: [],
    orders: [],
    orderEvents: [],
    payments: [],
    reviews: [],
    payouts: [],
    auditLogs: [],
  };

  // Still-reserved stock goes back on sale (a demo order finished in the console no longer holds any).
  const orders = await OrderModel.find({ _id: $in(ids.orders) })
    .select("packages.status packages.items.sku packages.items.qty")
    .lean<{ packages: { status: string; items: { sku: string; qty: number }[] }[] }[]>();
  for (const o of orders)
    for (const p of o.packages)
      if (["pending", "confirmed", "processing", "ready_to_ship", "shipped"].includes(p.status))
        for (const i of p.items)
          await InventoryModel.updateOne({ sku: i.sku }, { $inc: { reserved: -i.qty, available: i.qty } });

  // Ratings: where nothing else changed since the demo was added, put the exact old value back
  // (averages are rounded on every change). Otherwise take the demo reviews out one by one.
  const key = (x: { kind: string; id: string }): string => `${x.kind}:${x.id}`;
  const after = new Map((m.ratingsAfter ?? []).map((x) => [key(x), x]));
  const restored = new Set<string>();
  for (const before of m.ratingsBefore ?? []) {
    const model = ratingColl(before.kind);
    const want = after.get(key(before));
    const now = await model.findOne({ _id: new Types.ObjectId(before.id) }, { projection: { rating: 1 } });
    if (want && now?.rating?.average === want.average && now.rating.count === want.count) {
      await model.updateOne(
        { _id: new Types.ObjectId(before.id) },
        { $set: { "rating.average": before.average, "rating.count": before.count } },
      );
      restored.add(key(before));
    }
  }
  // Fallback, same formula as the app: (average × count − rating) / (count − 1), rounded to 2.
  const subtract = async (kind: RatingSnap["kind"], id: Types.ObjectId, rating: number): Promise<void> => {
    const model = ratingColl(kind);
    const doc = await model.findOne({ _id: id }, { projection: { rating: 1 } });
    const count = doc?.rating?.count ?? 0;
    const average = doc?.rating?.average ?? 0;
    const left = Math.max(count - 1, 0);
    const next = left === 0 ? 0 : Math.round(((average * count - rating) / left) * 100) / 100;
    await model.updateOne(
      { _id: id },
      { $set: { "rating.average": Math.min(5, Math.max(0, next)), "rating.count": left } },
    );
  };
  const reviews = await ReviewModel.find({ _id: $in(ids.reviews), status: "visible" })
    .select("productId sellerId rating")
    .lean<{ productId: Types.ObjectId; sellerId: Types.ObjectId; rating: number }[]>();
  for (const rv of reviews) {
    if (!restored.has(`product:${rv.productId.toString()}`))
      await subtract("product", rv.productId, rv.rating);
    if (!restored.has(`seller:${rv.sellerId.toString()}`)) await subtract("seller", rv.sellerId, rv.rating);
  }

  const out: Record<string, number> = {};
  const del = async (name: string, coll: string, list: Types.ObjectId[]): Promise<void> => {
    out[name] = list.length ? (await db.collection(coll).deleteMany({ _id: $in(list) })).deletedCount : 0;
  };
  await del("reviews", ReviewModel.collection.collectionName, ids.reviews);
  await del("orderEvents", OrderEventModel.collection.collectionName, ids.orderEvents);
  await del("payments", PaymentModel.collection.collectionName, ids.payments);
  await del("orders", OrderModel.collection.collectionName, ids.orders);
  await del("payouts", PayoutModel.collection.collectionName, ids.payouts);
  await del("auditLogs", AuditLogModel.collection.collectionName, ids.auditLogs);
  await del("users", UserModel.collection.collectionName, ids.users);
  for (const id of m.bankPatched ?? [])
    await SellerModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: { payoutAccount: null } });
  await manifestColl().deleteOne({ _id: "manifest" });
  return out;
}
