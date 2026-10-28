import type { Connection } from "mongoose";
import type { Migration } from "./types";

type RawItem = Record<string, unknown> & { serialNumber?: string | null; serialNumbers?: string[] };
type RawOrder = { _id: unknown; packages: { items: RawItem[] }[] };

const ordersOf = (conn: Connection) => {
  if (!conn.db) throw new Error("No database handle");
  return conn.db.collection<RawOrder>("orders");
};

/** Rewrites every item of `order` with `fn`; returns true when something changed. */
function mapItems(order: RawOrder, fn: (item: RawItem) => RawItem): boolean {
  let changed = false;
  for (const p of order.packages) {
    p.items = p.items.map((i) => {
      const next = fn(i);
      if (next !== i) changed = true;
      return next;
    });
  }
  return changed;
}

/**
 * Order items held one `serialNumber`, but a line can have up to 10 units (two phones = two
 * IMEIs). Moves it into `serialNumbers[]`. Uses the raw collection (the model no longer knows
 * the old field). Idempotent both ways.
 */
export const migration: Migration = {
  id: "0008-order-item-serial-numbers",
  description: "Order items: serialNumber → serialNumbers[]",
  async up(conn) {
    const orders = ordersOf(conn);
    for await (const o of orders.find({}, { projection: { packages: 1 } })) {
      const changed = mapItems(o, (i) => {
        if (!("serialNumber" in i) && Array.isArray(i.serialNumbers)) return i;
        const { serialNumber, ...rest } = i;
        const list = Array.isArray(i.serialNumbers) ? i.serialNumbers : [];
        return { ...rest, serialNumbers: list.length ? list : serialNumber ? [serialNumber] : [] };
      });
      if (changed) await orders.updateOne({ _id: o._id }, { $set: { packages: o.packages } });
    }
  },
  async down(conn) {
    const orders = ordersOf(conn);
    for await (const o of orders.find({}, { projection: { packages: 1 } })) {
      const changed = mapItems(o, (i) => {
        if (!("serialNumbers" in i)) return i;
        const { serialNumbers, ...rest } = i;
        return { ...rest, serialNumber: serialNumbers?.[0] ?? null };
      });
      if (changed) await orders.updateOne({ _id: o._id }, { $set: { packages: o.packages } });
    }
  },
};
