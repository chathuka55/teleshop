/** Audit log areas (action prefixes) the viewer filters by — an allow-list, never free text. */
export const AUDIT_GROUPS = [
  "auth.",
  "order.",
  "payment.",
  "fulfilment.",
  "seller.",
  "product.",
  "inventory.",
  "review.",
  "user.",
  "payout.",
] as const;
