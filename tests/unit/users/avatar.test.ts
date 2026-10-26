import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, AVATAR_SIZE, InvalidImageError, processAvatar } from "@/lib/images/avatar";
import { ownObjectPath } from "@/lib/storage/blob";

const photo = (format: "jpeg" | "png" | "webp" | "gif", w = 800, h = 600) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 90, b: 200 } } })
    .toFormat(format)
    .toBuffer();

describe("processAvatar (upload checks by content)", () => {
  it("re-encodes a JPG into a square WebP without metadata", async () => {
    const withGps = await sharp(await photo("jpeg"))
      .withExif({ IFD0: { Copyright: "secret" }, IFD3: { GPSLatitudeRef: "N" } })
      .jpeg()
      .toBuffer();
    const out = await processAvatar(withGps);
    const meta = await sharp(out.bytes).metadata();
    expect(out.contentType).toBe("image/webp");
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", AVATAR_SIZE, AVATAR_SIZE]);
    expect(meta.exif).toBeUndefined();
  });

  it("accepts PNG and WebP", async () => {
    await expect(processAvatar(await photo("png"))).resolves.toBeTruthy();
    await expect(processAvatar(await photo("webp"))).resolves.toBeTruthy();
  });

  it("refuses files that only pretend to be photos", async () => {
    await expect(processAvatar(new TextEncoder().encode("<svg onload=alert(1)>"))).rejects.toBeInstanceOf(
      InvalidImageError,
    );
    await expect(processAvatar(await photo("gif"))).rejects.toThrow(/JPG, PNG or WebP/);
    await expect(processAvatar(new Uint8Array())).rejects.toBeInstanceOf(InvalidImageError);
  });

  it("refuses files over 4 MB before decoding them", async () => {
    await expect(processAvatar(new Uint8Array(AVATAR_MAX_BYTES + 1))).rejects.toThrow(/4 MB/);
  });
});

describe("ownObjectPath (only our files are ever deleted)", () => {
  it("returns the path for our bucket's avatars only", () => {
    expect(ownObjectPath("https://b65e2efccddc.blob.upstash.io/avatars/u1-ab.webp", "avatars")).toBe(
      "avatars/u1-ab.webp",
    );
    expect(ownObjectPath("https://b65e2efccddc.blob.upstash.io/products/x.webp", "avatars")).toBeNull();
    expect(ownObjectPath("https://lh3.googleusercontent.com/avatars/x", "avatars")).toBeNull();
    expect(ownObjectPath("/images/brand/x.png", "avatars")).toBeNull();
    expect(ownObjectPath(null, "avatars")).toBeNull();
  });
});
