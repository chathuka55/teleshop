import { Types } from "mongoose";
import type { CourierDTO } from "@/modules/orders/admin-types";
import { connectDB } from "../mongoose";
import { CourierModel } from "../models/courier.model";

type LeanCourier = { _id: Types.ObjectId; name: string; codePattern: string; trackingUrlTemplate: string };

const toDTO = (c: LeanCourier): CourierDTO => ({
  id: c._id.toString(),
  name: c.name,
  codePattern: c.codePattern,
  trackingUrlTemplate: c.trackingUrlTemplate,
});

export async function listActiveCouriers(): Promise<CourierDTO[]> {
  await connectDB();
  const rows = await CourierModel.find({ isActive: true }).sort({ name: 1 }).lean<LeanCourier[]>();
  return rows.map(toDTO);
}

export async function findActiveCourier(id: string): Promise<CourierDTO | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDB();
  const c = await CourierModel.findOne({ _id: new Types.ObjectId(id), isActive: true }).lean<LeanCourier>();
  return c ? toDTO(c) : null;
}
