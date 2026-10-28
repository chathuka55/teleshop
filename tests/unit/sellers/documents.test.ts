import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkBusinessDocument } from "@/lib/documents/business-document";
import { InvalidImageError } from "@/lib/images/avatar";
import { decryptDocument, encryptDocument } from "@/lib/security/doc-crypto";

describe("encrypted seller documents (ADR-006)", () => {
  const key = randomBytes(32);
  const pdf = Buffer.from("%PDF-1.7 secret registration number PV 00214587 %%EOF");

  it("round-trips, and the stored bytes don't contain the document", () => {
    const sealed = encryptDocument(pdf, key, "kyc/a.bin");
    expect(sealed.includes(Buffer.from("PV 00214587"))).toBe(false);
    expect(decryptDocument(sealed, key, "kyc/a.bin").equals(pdf)).toBe(true);
    // A fresh IV every time: the same file never encrypts to the same bytes.
    expect(encryptDocument(pdf, key, "kyc/a.bin").equals(sealed)).toBe(false);
  });

  it("refuses the wrong key, a different path, or a changed byte", () => {
    const sealed = encryptDocument(pdf, key, "kyc/a.bin");
    expect(() => decryptDocument(sealed, randomBytes(32), "kyc/a.bin")).toThrow();
    expect(() => decryptDocument(sealed, key, "kyc/b.bin")).toThrow();
    const tampered = Buffer.from(sealed);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
    expect(() => decryptDocument(tampered, key, "kyc/a.bin")).toThrow();
    expect(() => decryptDocument(Buffer.from([9, 1, 2]), key, "kyc/a.bin")).toThrow();
  });
});

describe("checkBusinessDocument", () => {
  it("accepts a PDF as is", async () => {
    const pdf = Buffer.from("%PDF-1.4 %%EOF");
    expect(await checkBusinessDocument(pdf)).toMatchObject({ contentType: "application/pdf", ext: "pdf" });
  });
  it("re-encodes photos to JPEG without metadata", async () => {
    const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#ffffff" } })
      .withExif({ IFD0: { Copyright: "secret" } })
      .png()
      .toBuffer();
    const out = await checkBusinessDocument(png);
    expect(out.contentType).toBe("image/jpeg");
    const meta = await sharp(out.bytes).metadata();
    expect([meta.format, meta.exif]).toEqual(["jpeg", undefined]);
  });
  it("refuses anything else", async () => {
    for (const bad of ["<html>hi</html>", "", "MZ-not-a-photo"]) {
      await expect(checkBusinessDocument(new TextEncoder().encode(bad))).rejects.toBeInstanceOf(
        InvalidImageError,
      );
    }
  });
});
