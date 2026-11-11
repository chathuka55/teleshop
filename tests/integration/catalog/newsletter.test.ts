import { describe, expect, it } from "vitest";
import { NewsletterSubscriberModel } from "@/db/models/newsletter-subscriber.model";
import { findSubscriber, upsertSubscriber } from "@/db/repositories/newsletter.repository";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_newsletter");

describe("newsletter sign-ups (P3-T07)", () => {
  it("stores one record per address and refreshes consent on a repeat sign-up", async () => {
    const first = new Date("2026-11-01T10:00:00Z");
    const again = new Date("2026-11-12T10:00:00Z");
    await upsertSubscriber("nimal@example.lk", "home", first);
    await upsertSubscriber("nimal@example.lk", "home", again);

    expect(await NewsletterSubscriberModel.countDocuments({ email: "nimal@example.lk" })).toBe(1);
    expect(await findSubscriber("nimal@example.lk")).toEqual({
      email: "nimal@example.lk",
      status: "subscribed",
      source: "home",
      consentAt: again,
    });
  });

  it("re-subscribes someone who had unsubscribed", async () => {
    await NewsletterSubscriberModel.create({
      email: "kamal@example.lk",
      status: "unsubscribed",
      consentAt: new Date("2026-01-01T00:00:00Z"),
      unsubscribedAt: new Date("2026-02-01T00:00:00Z"),
    });
    await upsertSubscriber("kamal@example.lk", "home", new Date("2026-11-12T00:00:00Z"));
    const doc = await NewsletterSubscriberModel.findOne({ email: "kamal@example.lk" }).lean();
    expect(doc?.status).toBe("subscribed");
    expect(doc?.unsubscribedAt).toBeUndefined();
  });

  it("survives simultaneous sign-ups of the same address", async () => {
    await NewsletterSubscriberModel.syncIndexes();
    const now = new Date();
    await Promise.all(Array.from({ length: 5 }, () => upsertSubscriber("race@example.lk", "home", now)));
    expect(await NewsletterSubscriberModel.countDocuments({ email: "race@example.lk" })).toBe(1);
  });
});
