import "server-only";
import {
  countAddresses,
  createAddress,
  deleteAddress,
  findAddress,
  listAddresses,
  updateAddress,
} from "@/db/repositories/address.repository";
import { requireUser } from "@/lib/auth/guards";
import { MAX_ADDRESSES, addressOwnerId } from "./access";
import type { AddressFormInput } from "./schema";
import type { AddressDTO, AddressInput } from "./types";

const toInput = ({ makeDefault: _drop, ...rest }: AddressFormInput): AddressInput => rest;

export type SaveAddressResult = { ok: true; address: AddressDTO } | { ok: false; message: string };

export async function listMyAddresses(): Promise<AddressDTO[]> {
  return listAddresses(addressOwnerId(await requireUser()));
}

/** Create (no id) or update (id). The first address a user saves becomes the default. */
export async function saveMyAddress(input: AddressFormInput, id?: string): Promise<SaveAddressResult> {
  const owner = addressOwnerId(await requireUser());
  if (id) {
    const ok = await updateAddress(owner, id, toInput(input), input.makeDefault);
    const address = ok ? await findAddress(owner, id) : null;
    return address ? { ok: true, address } : { ok: false, message: "That address no longer exists." };
  }
  const count = await countAddresses(owner);
  if (count >= MAX_ADDRESSES) {
    return { ok: false, message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one first.` };
  }
  return { ok: true, address: await createAddress(owner, toInput(input), input.makeDefault || count === 0) };
}

export async function deleteMyAddress(id: string): Promise<boolean> {
  return deleteAddress(addressOwnerId(await requireUser()), id);
}
