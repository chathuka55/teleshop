import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/config/env";

const valid = {
  NODE_ENV: "development",
  MONGODB_URI: "mongodb+srv://teleshop_app:pw@cluster0.example.mongodb.net/teleshop",
  MONGODB_DB: "teleshop",
  AUTH_SECRET: "a".repeat(32),
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parseEnv (P0-T03)", () => {
  it("accepts a valid development environment", () => {
    const env = parseEnv(valid);
    expect(env.MONGODB_DB).toBe("teleshop");
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("treats empty optional values as missing", () => {
    const env = parseEnv({ ...valid, AUTH_GOOGLE_ID: "", UPSTASH_REDIS_REST_URL: "" });
    expect(env.AUTH_GOOGLE_ID).toBeUndefined();
  });

  it.each(["MONGODB_URI", "AUTH_SECRET", "TOTP_ENCRYPTION_KEY"] as const)(
    "fails when %s is missing",
    (key) => {
      const { [key]: _omit, ...rest } = valid;
      expect(() => parseEnv(rest)).toThrow(EnvError);
    },
  );

  it("rejects a non-Mongo connection string", () => {
    expect(() => parseEnv({ ...valid, MONGODB_URI: "postgres://x" })).toThrow(/MONGODB_URI/);
  });

  it("rejects a short AUTH_SECRET", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("rejects a TOTP key that is not 32 bytes", () => {
    expect(() => parseEnv({ ...valid, TOTP_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") })).toThrow(
      /TOTP_ENCRYPTION_KEY/,
    );
  });

  it("requires Upstash Redis and Upstash Blob in production", () => {
    let error: unknown;
    try {
      parseEnv({ ...valid, NODE_ENV: "production" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(EnvError);
    const issues = (error as EnvError).issues.join("\n");
    expect(issues).toMatch(/UPSTASH_REDIS_REST_URL/);
    expect(issues).toMatch(/UPSTASH_BLOB_TOKEN/);
  });

  it("never echoes secret values in the error", () => {
    const secret = "mongodb-NOT-A-URI-super-secret";
    try {
      parseEnv({ ...valid, MONGODB_URI: secret });
    } catch (e) {
      expect((e as Error).message).not.toContain(secret);
    }
  });
});
