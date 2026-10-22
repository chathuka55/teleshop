import { describe, expect, it } from "vitest";
import { registerSchema, sellerApplicationSchema, signInSchema } from "@/modules/auth/schema";
import { fieldErrors } from "@/lib/validation/form";

const registration = {
  name: "Chathuka Jayasekara",
  email: "Chathuka@Example.com",
  phone: "077 123 4567",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
  terms: "on",
};

describe("registerSchema", () => {
  it("normalises email and phone", () => {
    const r = registerSchema.parse(registration);
    expect(r.email).toBe("chathuka@example.com");
    expect(r.phone).toBe("+94771234567");
  });

  it("requires 10+ character passwords (docs/10)", () => {
    const r = registerSchema.safeParse({ ...registration, password: "short12", confirmPassword: "short12" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toMatch(/10/);
  });

  it("requires matching passwords and accepted terms", () => {
    const r = registerSchema.safeParse({ ...registration, confirmPassword: "different!!", terms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = fieldErrors(r.error);
      expect(f.terms).toBeDefined();
    }
    const mismatch = registerSchema.safeParse({ ...registration, confirmPassword: "different!!" });
    expect(!mismatch.success && fieldErrors(mismatch.error).confirmPassword).toBe("Passwords do not match");
  });
});

describe("signInSchema", () => {
  it("rejects operator objects", () => {
    expect(signInSchema.safeParse({ email: { $ne: null }, password: { $ne: null } }).success).toBe(false);
  });
});

describe("sellerApplicationSchema", () => {
  const app = {
    shopName: "PC Forge",
    shopType: "computer_shop",
    businessRegNo: "pv 00214587",
    addressLine1: "No. 7, Peradeniya Road",
    city: "Kandy",
    district: "Kandy",
    phone: "081 222 3344",
    agree: "on",
  };

  it("accepts a landline shop phone and upper-cases the BR number", () => {
    const r = sellerApplicationSchema.parse(app);
    expect(r.phone).toBe("+94812223344");
    expect(r.businessRegNo).toBe("PV 00214587");
  });

  it("only allows the 25 districts", () => {
    expect(sellerApplicationSchema.safeParse({ ...app, district: "Atlantis" }).success).toBe(false);
  });
});
