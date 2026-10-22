import mongoose from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import { InventoryModel } from "@/db/models";
import { migrateDown, migrateUp, appliedMigrations } from "@/db/migrations";
import { withTransaction } from "@/db/mongoose";
import { CourierModel, SettingsModel } from "@/db/models";
import { connectTestDatabase } from "../../support/db";
import { $gt, $in } from "@/db/operators";

connectTestDatabase("t_mongoose");

const oid = () => new mongoose.Types.ObjectId();

describe("withTransaction (P1-T01)", () => {
  beforeAll(async () => {
    await migrateUp(mongoose.connection);
  });

  it("commits all writes together", async () => {
    await withTransaction(async (session) => {
      await InventoryModel.create(
        [{ sku: "TX-COMMIT-1", productId: oid(), sellerId: oid(), onHand: 1, available: 1 }],
        { session },
      );
      await InventoryModel.create(
        [{ sku: "TX-COMMIT-2", productId: oid(), sellerId: oid(), onHand: 1, available: 1 }],
        { session },
      );
    });
    expect(await InventoryModel.countDocuments({ sku: $in(["TX-COMMIT-1", "TX-COMMIT-2"]) })).toBe(2);
  });

  it("rolls back every write when the callback throws", async () => {
    await expect(
      withTransaction(async (session) => {
        await InventoryModel.create(
          [{ sku: "TX-ABORT-1", productId: oid(), sellerId: oid(), onHand: 1, available: 1 }],
          { session },
        );
        throw new Error("OUT_OF_STOCK");
      }),
    ).rejects.toThrow("OUT_OF_STOCK");
    expect(await InventoryModel.countDocuments({ sku: "TX-ABORT-1" })).toBe(0);
  });
});

describe("sanitizeFilter (docs/10 NoSQL injection)", () => {
  it("neutralises operator objects coming from user input", async () => {
    await InventoryModel.create({ sku: "SAN-1", productId: oid(), sellerId: oid(), onHand: 3, available: 3 });
    const attacker: unknown = { $ne: null }; // e.g. JSON body {"sku": {"$ne": null}}
    // Wrapped as {$eq: {$ne: null}} → fails to cast: the query fails closed, nothing leaks.
    await expect(InventoryModel.find({ sku: attacker as string })).rejects.toThrow(/Cast to string/);
  });

  it("also neutralises query-builder operators (so ours must be trusted)", async () => {
    await expect(InventoryModel.countDocuments().where("available").gt(0)).rejects.toThrow(/Cast to Number/);
  });

  it("allows operators explicitly marked trusted", async () => {
    expect(await InventoryModel.countDocuments({ available: $gt(0) })).toBeGreaterThan(0);
  });
});

describe("migrations", () => {
  it("are recorded and idempotent", async () => {
    const before = (await appliedMigrations(mongoose.connection)).map((m) => m._id);
    expect(before).toEqual(["0001-init", "0002-validators", "0003-seed-couriers-settings"]);
    expect(await migrateUp(mongoose.connection)).toEqual([]);
  });

  it("0003 seeds the four couriers and settings.global", async () => {
    expect(await CourierModel.countDocuments()).toBe(4);
    const s = await SettingsModel.findById("global").lean();
    expect(s?.deliveryFeeCents).toBe(45_000);
  });

  it("0003 can be rolled back and re-applied", async () => {
    await migrateDown(mongoose.connection, "0003");
    expect(await CourierModel.countDocuments()).toBe(0);
    await migrateUp(mongoose.connection);
    expect(await CourierModel.countDocuments()).toBe(4);
  });

  it("0002 validator rejects negative stock even when Mongoose is bypassed", async () => {
    const raw = mongoose.connection.collection("inventory");
    await expect(
      raw.insertOne({
        sku: "RAW-NEG",
        productId: oid(),
        sellerId: oid(),
        onHand: 0,
        reserved: 0,
        available: -1,
      }),
    ).rejects.toThrow(/validation/i);
  });

  it("0002 validator rejects fractional money on orders", async () => {
    const raw = mongoose.connection.collection("orders");
    await expect(
      raw.insertOne({
        orderNo: "TS-2026-999999",
        customerId: oid(),
        idempotencyKey: "x",
        packages: [{}],
        totalCents: 10.5,
        status: "pending",
        paymentMethod: "cod",
      }),
    ).rejects.toThrow(/validation/i);
  });
});
