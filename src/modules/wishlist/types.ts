export type { ProductCardDTO } from "@/modules/catalog/types";

/** Result of a heart click: `guest` means it was only kept in the browser. */
export type ToggleWishlistResult = { status: "saved" | "removed" | "guest" };
