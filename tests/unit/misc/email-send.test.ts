import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string | undefined> = {};
vi.mock("@/config/env", () => ({ env: new Proxy({}, { get: (_t, k: string) => env[k] }) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { isSmtpUrl, parseSender, sendEmail } = await import("@/lib/email/send");
const { logger } = await import("@/lib/observability/logger");

const msg = { to: "buyer@example.com", subject: "Hi", text: "Body", replyTo: "reply@example.com" };

describe("parseSender", () => {
  it("reads a display name + address or a bare address", () => {
    expect(parseSender("Teleshop <shop@example.com>")).toEqual({
      name: "Teleshop",
      email: "shop@example.com",
    });
    expect(parseSender('"Teleshop LK" <shop@example.com>')).toEqual({
      name: "Teleshop LK",
      email: "shop@example.com",
    });
    expect(parseSender("shop@example.com")).toEqual({ email: "shop@example.com" });
    expect(parseSender("Teleshop")).toBeNull();
  });
});

describe("isSmtpUrl", () => {
  it("accepts smtp(s) URLs only — a bare SMTP key is a misconfiguration", () => {
    expect(isSmtpUrl("smtp://login:key@smtp-relay.brevo.com:587")).toBe(true);
    expect(isSmtpUrl("smtps://login:key@smtp.example.com:465")).toBe(true);
    expect(isSmtpUrl("xsmtpsib-abc123")).toBe(false);
  });
});

describe("sendEmail", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    for (const k of Object.keys(env)) delete env[k];
    env.EMAIL_FROM = "Teleshop <shop@example.com>";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is not configured without a Brevo key or SMTP URL", async () => {
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a bare key in EMAIL_SERVER as not configured instead of failing every send", async () => {
    env.EMAIL_SERVER = "xsmtpsib-abc123";
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "not_configured" });
  });

  it("posts to the Brevo API with the key header and verified sender", async () => {
    env.BREVO_API_KEY = "xkeysib-test";
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messageId: "<1@brevo>" }), { status: 201 }));

    expect(await sendEmail(msg)).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("xkeysib-test");
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { name: "Teleshop", email: "shop@example.com" },
      to: [{ email: "buyer@example.com" }],
      subject: "Hi",
      textContent: "Body",
      replyTo: { email: "reply@example.com" },
    });
  });

  it("reports a Brevo rejection as failed and logs the reason without the recipient", async () => {
    env.BREVO_API_KEY = "xkeysib-bad";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "unauthorized", message: "Key not found" }), { status: 401 }),
    );
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "failed" });
    const [event, fields] = vi.mocked(logger.error).mock.calls.at(-1)!;
    expect(event).toBe("email.send_failed");
    expect(fields).toMatchObject({ transport: "brevo", status: 401, code: "unauthorized" });
    expect(JSON.stringify(fields)).not.toContain("buyer@example.com");
  });

  it("reports a network error / timeout as failed", async () => {
    env.BREVO_API_KEY = "xkeysib-test";
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "failed" });
  });
});
