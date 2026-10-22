import { Lock, Package, ShieldCheck, Store, Truck } from "lucide-react";
import type { AuthFeature } from "@/components/layout/AuthShell";

export const customerFeatures: readonly AuthFeature[] = [
  { icon: ShieldCheck, title: "Verified sellers only", text: "Every shop is reviewed by our team" },
  { icon: Truck, title: "Track every package", text: "Courier tracking code & live status" },
  { icon: Lock, title: "Secure by design", text: "Encrypted sessions & 2-step security" },
];

export const sellerFeatures: readonly AuthFeature[] = [
  { icon: Store, title: "Your own shop page", text: "Reach customers across all 25 districts" },
  { icon: Package, title: "Simple order management", text: "Accept, pack, hand over & track" },
  { icon: ShieldCheck, title: "Verified seller badge", text: "Build trust and sell more" },
];
