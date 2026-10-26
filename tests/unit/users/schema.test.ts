import { describe, expect, it } from "vitest";
import { changePasswordSchema, profileSchema } from "@/modules/users/schema";

describe("profileSchema", () => {
  it("normalises the phone and allows clearing it", () => {
    expect(profileSchema.parse({ name: "  Nimal Perera ", phone: "077 123 4567" })).toEqual({
      name: "Nimal Perera",
      phone: "+94771234567",
    });
    expect(profileSchema.parse({ name: "Nimal", phone: "" }).phone).toBeNull();
  });

  it("rejects bad input", () => {
    expect(profileSchema.safeParse({ name: "N", phone: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Nimal", phone: "12345" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "old-password-1",
    password: "brand-new-pass",
    confirmPassword: "brand-new-pass",
  };
  it("needs matching, different, long-enough passwords", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "nope" }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        ...base,
        password: base.currentPassword,
        confirmPassword: base.currentPassword,
      }).success,
    ).toBe(false);
  });
});
