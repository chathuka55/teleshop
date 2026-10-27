import type { District } from "@/config/districts";

export type AddressLabel = "home" | "office" | "other";

/** Address fields as stored (docs/08 `addresses`). Phone is +94XXXXXXXXX. */
export type AddressInput = {
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  district: District;
  postalCode: string | null;
};

export type AddressDTO = AddressInput & { id: string; isDefault: boolean };
