import { connectDB } from "../mongoose";
import { SettingsModel } from "../models/settings.model";

export type SettingsDTO = {
  deliveryFeeCents: number;
  expressFeeCents: number;
  codEnabled: boolean;
  autoCancelHours: number;
  platformFeeBp: number;
};

const DEFAULTS: SettingsDTO = {
  deliveryFeeCents: 45_000,
  expressFeeCents: 95_000,
  codEnabled: true,
  autoCancelHours: 48,
  platformFeeBp: 300,
};

/** `settings.global` (created by migration 0003); falls back to the documented defaults. */
export async function getSettings(): Promise<SettingsDTO> {
  await connectDB();
  const s = await SettingsModel.findById("global").lean<Partial<SettingsDTO>>();
  return {
    deliveryFeeCents: s?.deliveryFeeCents ?? DEFAULTS.deliveryFeeCents,
    expressFeeCents: s?.expressFeeCents ?? DEFAULTS.expressFeeCents,
    codEnabled: s?.codEnabled ?? DEFAULTS.codEnabled,
    autoCancelHours: s?.autoCancelHours ?? DEFAULTS.autoCancelHours,
    platformFeeBp: s?.platformFeeBp ?? DEFAULTS.platformFeeBp,
  };
}
