import type { Types } from "mongoose";
import type { AddressDTO, AddressInput } from "@/modules/addresses/types";
import { connectDB } from "../mongoose";
import { AddressModel } from "../models/address.model";
import { $ne } from "../operators";

/** Every query here is scoped by `userId` — an address id alone never reaches another user's row. */

type LeanAddress = AddressInput & { _id: Types.ObjectId; isDefault: boolean };

function toAddressDTO(a: LeanAddress): AddressDTO {
  return {
    id: a._id.toString(),
    label: a.label,
    recipientName: a.recipientName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    district: a.district,
    postalCode: a.postalCode ?? null,
    isDefault: a.isDefault,
  };
}

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  await connectDB();
  const rows = await AddressModel.find({ userId })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean<LeanAddress[]>();
  return rows.map(toAddressDTO);
}

export async function findAddress(userId: string, id: string): Promise<AddressDTO | null> {
  await connectDB();
  const a = await AddressModel.findOne({ _id: id, userId }).lean<LeanAddress>();
  return a ? toAddressDTO(a) : null;
}

export async function countAddresses(userId: string): Promise<number> {
  await connectDB();
  return AddressModel.countDocuments({ userId });
}

async function clearOtherDefaults(userId: string, keepId: string): Promise<void> {
  await AddressModel.updateMany({ userId, _id: $ne(keepId) }, { $set: { isDefault: false } });
}

export async function createAddress(
  userId: string,
  input: AddressInput,
  makeDefault: boolean,
): Promise<AddressDTO> {
  await connectDB();
  const doc = await AddressModel.create({ ...input, userId, isDefault: makeDefault });
  if (makeDefault) await clearOtherDefaults(userId, doc._id.toString());
  return toAddressDTO(doc.toObject() as LeanAddress);
}

export async function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
  makeDefault: boolean,
): Promise<boolean> {
  await connectDB();
  const r = await AddressModel.updateOne(
    { _id: id, userId },
    { $set: { ...input, ...(makeDefault ? { isDefault: true } : {}) } },
  );
  if (r.matchedCount === 1 && makeDefault) await clearOtherDefaults(userId, id);
  return r.matchedCount === 1;
}

/** Deleting the default makes the most recent remaining address the default. */
export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  await connectDB();
  const removed = await AddressModel.findOneAndDelete({ _id: id, userId }).lean<LeanAddress>();
  if (!removed) return false;
  if (removed.isDefault) {
    const next = await AddressModel.findOne({ userId })
      .sort({ updatedAt: -1 })
      .select("_id")
      .lean<{ _id: Types.ObjectId }>();
    if (next) await AddressModel.updateOne({ _id: next._id, userId }, { $set: { isDefault: true } });
  }
  return true;
}
