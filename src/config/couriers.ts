/**
 * Default couriers, seeded into the `couriers` collection by migration 0003
 * (docs/08-data-model.md §3.1). Admins can edit them later in /admin/couriers.
 */
export type CourierSeed = {
  name: string;
  codePattern: string;
  trackingUrlTemplate: string;
};

export const defaultCouriers: readonly CourierSeed[] = [
  {
    name: "Prompt Xpress",
    codePattern: String.raw`^PX-\d{4} \d{4} LK$`,
    trackingUrlTemplate: "https://promptxpress.lk/track?code={code}",
  },
  {
    name: "Domex",
    codePattern: String.raw`^DX\d{9}$`,
    trackingUrlTemplate: "https://www.domex.lk/track?waybill={code}",
  },
  {
    name: "Koombiyo",
    codePattern: String.raw`^KB\d{8}$`,
    trackingUrlTemplate: "https://koombiyodelivery.lk/track?id={code}",
  },
  {
    name: "Pronto",
    codePattern: String.raw`^PR[A-Z0-9]{8,12}$`,
    trackingUrlTemplate: "https://www.pronto.lk/track?ref={code}",
  },
];

/** `courier.trackingUrlTemplate.replace('{code}', encodeURIComponent(code))` — doc phase-5. */
export function buildTrackingUrl(template: string, code: string): string {
  return template.replace("{code}", encodeURIComponent(code));
}
