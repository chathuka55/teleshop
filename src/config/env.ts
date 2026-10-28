import { z } from "zod";

/**
 * The only place that reads `process.env`. Imported by `next.config.ts`, so a bad
 * environment fails the build/dev server at start-up instead of at first request.
 * Server code imports `env`; client code may only read `NEXT_PUBLIC_*` values.
 */

const emptyToUndefined = (v: unknown): unknown => (v === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine((v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"), {
      message: "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    }),
  MONGODB_DB: z.string().min(1).default("teleshop"),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)"),
  AUTH_URL: optionalUrl,
  AUTH_TRUST_HOST: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,

  TOTP_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, {
    message: "TOTP_ENCRYPTION_KEY must be 32 random bytes, base64 encoded",
  }),

  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  // Upstash Blob (S3-compatible object storage) — product images, avatars, seller documents. ADR-005.
  UPSTASH_BLOB_TOKEN: optionalString,
  // Seller documents are AES-256-GCM encrypted before they reach the (public) bucket. ADR-006.
  DOCS_ENCRYPTION_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((v) => Buffer.from(v, "base64").length === 32, {
        message: "DOCS_ENCRYPTION_KEY must be 32 random bytes, base64 encoded",
      })
      .optional(),
  ),
  EMAIL_SERVER: optionalString,
  EMAIL_FROM: optionalString,
  // Vercel Cron sends it as "Authorization: Bearer …"; without it the cron routes refuse to run.
  CRON_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, "CRON_SECRET must be at least 32 characters (openssl rand -hex 32)").optional(),
  ),
});

export const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const envSchema = serverSchema.merge(publicSchema).superRefine((val, ctx) => {
  if (val.NODE_ENV !== "production") return;
  // In production these are required (doc 12 §2); in dev the in-memory fallbacks are used.
  const required = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "UPSTASH_BLOB_TOKEN"] as const;
  for (const key of required) {
    if (!val[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
  }
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment variables:\n  - ${issues.join("\n  - ")}`);
    this.name = "EnvError";
  }
}

/** Pure parser — unit tested. Throws `EnvError` listing every bad variable (never their values). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  throw new EnvError(issues);
}

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("src/config/env.ts must not be imported in client code. Use NEXT_PUBLIC_* values.");
  }
}

let cached: Env | undefined;

/** Full app environment, validated once on first use. */
export function getEnv(): Env {
  assertServer();
  if (cached) return cached;
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    // CI builds without secrets. Nothing that talks to services runs in that mode.
    return process.env as unknown as Env;
  }
  cached = parseEnv(process.env);
  return cached;
}

/**
 * Validated lazily on first property access, so CLI scripts (migrations in CI) can import
 * modules that depend on env.ts while only the Mongo variables exist.
 */
export const env: Env = new Proxy({} as Env, {
  get: (_target, key) => getEnv()[key as keyof Env],
});

export const dbEnvSchema = serverSchema.pick({ NODE_ENV: true, MONGODB_URI: true, MONGODB_DB: true });
export type DbEnv = z.infer<typeof dbEnvSchema>;

/** Only the database variables — used by `src/db/mongoose.ts` and the db:* scripts. */
export function getDbEnv(source: Record<string, string | undefined> = process.env): DbEnv {
  assertServer();
  const result = dbEnvSchema.safeParse(source);
  if (result.success) return result.data;
  throw new EnvError(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
}
