import { describe, expect, it } from "vitest";
import { REDACTED, pathOnly, scrub, scrubError, scrubText } from "@/lib/observability/scrub";

describe("scrubText", () => {
  it.each([
    ["Duplicate key for nimal.perera@gmail.com", "Duplicate key for [email]"],
    ["call +94 77 123 4567 now", "call [phone] now"],
    ["mobile 0771234567.", "mobile [phone]."],
    ["phone 077-123-4567", "phone [phone]"],
    ["IMEI 356938035643809 already used", "IMEI [number] already used"],
    [
      "connect mongodb+srv://teleshop_app:S3cret!@cluster0.abc.mongodb.net/teleshop failed",
      `connect mongodb+srv://${REDACTED}@cluster0.abc.mongodb.net/teleshop failed`,
    ],
    ["Authorization: Bearer abcdefghijklmnop1234", `Authorization: Bearer ${REDACTED}`],
    ["GET /verify-email?token=abc123def456&x=1", `GET /verify-email?token=${REDACTED}&x=1`],
    ["session eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl", `session ${REDACTED}`],
    ["hash 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", "hash [hex]"],
  ])("%s", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it("leaves ordinary text, order numbers and prices alone", () => {
    const text = "Order TS-2026-000123 failed: OUT_OF_STOCK for sku APL-17P-256-ORG (LKR 389,900)";
    expect(scrubText(text)).toBe(text);
  });
});

describe("scrub", () => {
  it("drops sensitive keys at any depth and scrubs strings", () => {
    const out = scrub({
      route: "/checkout",
      password: "hunter22hunter",
      user: { email: "a@b.lk", role: "customer", id: "665f1c2b9a1e4b0012345678" },
      address: { line1: "12 Temple Road", city: "Kandy" },
      headers: { cookie: "authjs.session-token=…", Authorization: "Bearer x" },
      note: "ask nimal@x.lk",
    });
    expect(out).toEqual({
      route: "/checkout",
      password: REDACTED,
      user: { email: REDACTED, role: "customer", id: "665f1c2b9a1e4b0012345678" },
      address: REDACTED,
      headers: { cookie: REDACTED, Authorization: REDACTED },
      note: "ask [email]",
    });
  });

  it("keeps diagnostic keys that only look similar", () => {
    const fields = {
      code: "OUT_OF_STOCK",
      statusCode: 409,
      routeType: "action",
      zipLevel: 1,
      technical: "x",
    };
    const out = scrub(fields) as Record<string, unknown>;
    expect(out.code).toBe("OUT_OF_STOCK");
    expect(out.statusCode).toBe(409);
    expect(out.routeType).toBe("action");
    expect(out.technical).toBe("x");
    expect(scrub({ resetCode: "1", totp: "2", nic: "3", ip: "4", firstName: "5", cardLast4: "6" })).toEqual({
      resetCode: REDACTED,
      totp: REDACTED,
      nic: REDACTED,
      ip: REDACTED,
      firstName: REDACTED,
      cardLast4: REDACTED,
    });
  });

  it("survives cycles and deep nesting", () => {
    const a: Record<string, unknown> = { level: 0 };
    a.self = a;
    expect(scrub(a)).toEqual({ level: 0, self: "[circular]" });
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    expect(JSON.stringify(scrub(deep))).toContain("[truncated]");
  });
});

describe("scrubError", () => {
  it("keeps name and digest, scrubs message and stack", () => {
    const err = Object.assign(new Error("No user with email kamal@teleshop.lk"), { digest: "123456" });
    const out = scrubError(err);
    expect(out.name).toBe("Error");
    expect(out.digest).toBe("123456");
    expect(out.message).toBe("No user with email [email]");
    expect(out.stack).not.toContain("kamal@");
  });

  it("handles thrown non-errors", () => {
    expect(scrubError("boom for 0771234567")).toEqual({ name: "NonError", message: "boom for [phone]" });
  });
});

describe("pathOnly", () => {
  it("strips the query string and fragment", () => {
    expect(pathOnly("https://teleshop.lk/reset-password?token=abc#x")).toBe("/reset-password");
    expect(pathOnly("/shop?q=iphone")).toBe("/shop");
  });
});
