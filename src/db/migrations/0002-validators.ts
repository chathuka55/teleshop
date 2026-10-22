import type { Migration } from "./types";

/** Integer ≥ 0 — JS numbers are stored as int32 or double, so check with multipleOf. */
const nonNegInt = { bsonType: ["int", "long", "double"], minimum: 0, multipleOf: 1 };

const inventoryValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["sku", "productId", "sellerId", "onHand", "reserved", "available"],
    properties: {
      sku: { bsonType: "string" },
      onHand: nonNegInt,
      reserved: nonNegInt,
      available: nonNegInt,
    },
  },
};

const ordersValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "orderNo",
      "customerId",
      "idempotencyKey",
      "packages",
      "totalCents",
      "status",
      "paymentMethod",
    ],
    properties: {
      orderNo: { bsonType: "string", pattern: "^TS-\\d{4}-\\d{6}$" },
      subtotalCents: nonNegInt,
      deliveryCents: nonNegInt,
      discountCents: nonNegInt,
      totalCents: nonNegInt,
      paymentMethod: { enum: ["cod"] },
      packages: { bsonType: "array", minItems: 1 },
    },
  },
};

/** $jsonSchema validators for `inventory` and `orders` — a second guard behind Mongoose (docs/08 §4). */
export const migration: Migration = {
  id: "0002-validators",
  description: "$jsonSchema validators for orders and inventory",
  async up(conn) {
    const db = conn.db;
    if (!db) throw new Error("No database handle");
    for (const [name, validator] of [
      ["inventory", inventoryValidator],
      ["orders", ordersValidator],
    ] as const) {
      await db.command({ collMod: name, validator, validationLevel: "strict", validationAction: "error" });
    }
  },
  async down(conn) {
    const db = conn.db;
    if (!db) throw new Error("No database handle");
    for (const name of ["inventory", "orders"]) {
      await db.command({ collMod: name, validator: {}, validationLevel: "off" });
    }
  },
};
