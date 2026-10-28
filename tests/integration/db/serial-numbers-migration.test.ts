import mongoose from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import { OrderModel } from "@/db/models";
import { migration } from "@/db/migrations/0008-order-item-serial-numbers";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_serial_numbers");

type RawItem = { sku: string; serialNumber?: string | null; serialNumbers?: string[] };
const items = async (orderNo: string): Promise<RawItem[]> => {
  const o = (await OrderModel.collection.findOne({ orderNo })) as { packages: { items: RawItem[] }[] } | null;
  return o?.packages.flatMap((p) => p.items) ?? [];
};

beforeAll(async () => {
  await OrderModel.collection.deleteMany({});
  // Raw inserts shaped like orders before v0.4: one `serialNumber` per item.
  await OrderModel.collection.insertMany([
    {
      orderNo: "TS-2026-000901",
      packages: [
        {
          items: [
            { sku: "A", serialNumber: "356938035643809" },
            { sku: "B", serialNumber: null },
          ],
        },
      ],
    },
    { orderNo: "TS-2026-000902", packages: [{ items: [{ sku: "C", serialNumbers: ["SN123456"] }] }] },
  ]);
});

describe("0008 order item serial numbers", () => {
  it("moves serialNumber into serialNumbers[] and is idempotent", async () => {
    await migration.up(mongoose.connection);
    await migration.up(mongoose.connection);
    expect(await items("TS-2026-000901")).toEqual([
      { sku: "A", serialNumbers: ["356938035643809"] },
      { sku: "B", serialNumbers: [] },
    ]);
    expect(await items("TS-2026-000902")).toEqual([{ sku: "C", serialNumbers: ["SN123456"] }]);
  });

  it("down keeps the first number", async () => {
    await migration.down(mongoose.connection);
    expect(await items("TS-2026-000901")).toEqual([
      { sku: "A", serialNumber: "356938035643809" },
      { sku: "B", serialNumber: null },
    ]);
    expect(await items("TS-2026-000902")).toEqual([{ sku: "C", serialNumber: "SN123456" }]);
  });
});
