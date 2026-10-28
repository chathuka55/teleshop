import { z } from "zod";

/* Admin configuration forms (P7-T03/T05): site settings, couriers, categories, brands. */

/** Up to 8 digits of rupees and 2 of cents → integer cents. */
const rupees = (label: string, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/,/g, ""))
    .refine((v) => {
      const [whole = "", frac, ...rest] = v.split(".");
      return rest.length === 0 && /^\d{1,8}$/.test(whole) && (frac === undefined || /^\d{1,2}$/.test(frac));
    }, `Enter ${label} in rupees`)
    .transform((v) => {
      const [whole = "0", frac = ""] = v.split(".");
      return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
    })
    .refine((c) => c <= max * 100, `At most LKR ${max.toLocaleString("en-LK")}`);

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

export const settingsSchema = z.object({
  deliveryFee: rupees("the standard delivery fee", 10_000),
  expressFee: rupees("the express delivery fee", 20_000),
  codEnabled: checkbox,
  /** Percent with up to 2 decimals → basis points (3 → 300, 2.5 → 250). */
  platformFeePct: z
    .string()
    .trim()
    .refine((v) => {
      const [whole = "", frac, ...rest] = v.split(".");
      return rest.length === 0 && /^\d{1,2}$/.test(whole) && (frac === undefined || /^\d{1,2}$/.test(frac));
    }, "Enter a percentage, e.g. 3 or 2.5")
    .transform((v) => Math.round(Number(v) * 100))
    .refine((bp) => bp <= 3000, "At most 30 %"),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/** Compiles and isn't absurdly long; anchors are up to the admin. */
function isPattern(v: string): boolean {
  if (v.length > 200) return false;
  try {
    // eslint-disable-next-line security/detect-non-literal-regexp -- admin-supplied, validated here
    new RegExp(v);
    return true;
  } catch {
    return false;
  }
}

export const courierSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .or(z.literal("")),
    name: z.string().trim().min(2, "Enter the courier's name").max(60),
    codePattern: z
      .string()
      .trim()
      .min(2, "Enter the tracking code format")
      .refine(isPattern, "That isn't a valid pattern"),
    /** A real code from a slip: the pattern must accept it (catches typos in the pattern). */
    sampleCode: z.string().trim().min(2, "Paste one real tracking code").max(40),
    trackingUrlTemplate: z
      .string()
      .trim()
      .max(300)
      .refine(
        (v) => v.startsWith("https://") && v.includes("{code}"),
        "Must be an https:// link containing {code}",
      )
      .refine((v) => URL.canParse(v.replace("{code}", "X")), "That isn't a valid link"),
    isActive: checkbox,
  })
  .superRefine((d, ctx) => {
    if (!isPattern(d.codePattern)) return;
    // eslint-disable-next-line security/detect-non-literal-regexp -- validated by isPattern above
    const format = new RegExp(d.codePattern);
    if (!format.test(d.sampleCode.replace(/\s+/g, " ").toUpperCase())) {
      ctx.addIssue({ code: "custom", path: ["sampleCode"], message: "The format doesn't accept this code" });
    }
  });
export type CourierInput = z.infer<typeof courierSchema>;

export const brandSchema = z.object({
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .or(z.literal("")),
  name: z.string().trim().min(1, "Enter the brand name").max(60),
  isActive: checkbox,
});
export type BrandInput = z.infer<typeof brandSchema>;

export const categoryIcons = [
  "phone",
  "laptop",
  "cpu",
  "headphones",
  "watch",
  "monitor",
  "gamepad",
  "wifi",
] as const;

const specField = z
  .object({
    key: z
      .string()
      .trim()
      .regex(
        /^[a-z][a-zA-Z0-9]{0,30}$/,
        "Lower-case letters and digits, starting with a letter (e.g. batteryLife)",
      ),
    label: z.string().trim().min(1, "Enter a label").max(40),
    type: z.enum(["text", "number", "select"]),
    unit: z.string().trim().max(12).default(""),
    options: z.array(z.string().trim().min(1).max(30)).max(30).default([]),
    filterable: z.boolean().default(false),
  })
  .superRefine((f, ctx) => {
    if (f.type === "select" && f.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "A list needs at least 2 choices" });
    }
    if (new Set(f.options).size !== f.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Each choice only once" });
    }
  });

export const categorySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .or(z.literal("")),
    name: z.string().trim().min(2, "Enter the category name").max(60),
    icon: z.enum(categoryIcons),
    requiresSerial: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(999),
    specTemplate: z.array(specField).max(30, "At most 30 fields"),
  })
  .superRefine((c, ctx) => {
    const keys = c.specTemplate.map((f) => f.key);
    keys.forEach((k, i) => {
      if (keys.indexOf(k) !== i) {
        ctx.addIssue({ code: "custom", path: ["specTemplate", i, "key"], message: "Each key only once" });
      }
    });
  });
export type CategoryInput = z.infer<typeof categorySchema>;
