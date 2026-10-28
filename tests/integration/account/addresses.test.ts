import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import {
  createAddress,
  deleteAddress,
  findAddress,
  listAddresses,
  updateAddress,
} from "@/db/repositories/address.repository";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_addresses");

const input = {
  label: "home",
  recipientName: "Nimal Perera",
  phone: "+94771234567",
  line1: "12 Temple Road",
  line2: "",
  city: "Kandy",
  district: "Kandy",
  postalCode: "",
} as const;

describe("address book ownership (docs/10 §3)", () => {
  it("another user can't read, change or delete someone's address", async () => {
    const owner = new Types.ObjectId().toString();
    const stranger = new Types.ObjectId().toString();
    const a = await createAddress(owner, input, true);

    expect(await findAddress(stranger, a.id)).toBeNull();
    expect(await listAddresses(stranger)).toEqual([]);
    expect(await updateAddress(stranger, a.id, { ...input, line1: "1 Fake Street" }, true)).toBe(false);
    expect(await deleteAddress(stranger, a.id)).toBe(false);

    expect(await findAddress(owner, a.id)).toMatchObject({ line1: "12 Temple Road", isDefault: true });
  });
});
