# API — Server Actions and REST endpoints

**DOC-09** · Forms inside the app use **Server Actions**. A versioned REST API under `/api/v1` serves dashboards, the 3D/compare widgets and future mobile apps. Both call the same services.

## 1. Conventions
- JSON only. Errors: `{ "error": { "code": "OUT_OF_STOCK", "message": "…", "fields": { … } } }` with the right HTTP status.
- Every handler: `parse (Zod) → auth guard → rate limit (if listed) → service → DTO`.
- Pagination: cursor based `?cursor=<id>&limit=20` (max 50).
- Money in responses: `priceCents` (integer) — format in the UI.

## 2. Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION` | 400 | Zod failed; `fields` lists problems |
| `UNAUTHENTICATED` | 401 | Not signed in |
| `FORBIDDEN` | 403 | Wrong role or not the owner |
| `NOT_FOUND` | 404 | |
| `CONFLICT` | 409 | Duplicate (slug, sku, idempotency key) |
| `OUT_OF_STOCK` | 409 | Not enough `available` stock |
| `INVALID_TRACKING_CODE` | 422 | Does not match the courier pattern |
| `RATE_LIMITED` | 429 | Includes `Retry-After` |

## 3. Server Actions (main ones)

| Action | Module | Who | Rate limit |
| --- | --- | --- | --- |
| `registerAction`, `signInAction`, `requestPasswordResetAction`, `resetPasswordAction` | auth | public | 5/min/IP |
| `resendVerificationAction` | auth | signed in | 5/min/IP |
| `signOutAction`, `signInWithGoogleAction` | auth | public | — |
| `updateProfileAction`, `changePasswordAction`, `signOutEverywhereAction`, `avatarAction` | users | signed in | 10/min/IP |
| `toggleWishlistAction`, `syncWishlistAction` | wishlist | public (guests: no-op) / signed in | — |
| `syncCartAction`, `saveCartAction` | cart | public (guests: no-op) / signed in | — |
| `priceCheckoutAction` | cart | signed in | — |
| `saveAddressAction`, `deleteAddressAction` | addresses | signed in (owner) | — |
| `placeOrderAction` | orders | signed in, verified email | 10/min/IP |
| `confirmEnrolmentAction`, `verifySecondFactorAction`, `finishEnrolmentAction` (TOTP) | auth | admin (password step done) | 5/min/user |
| `addToCartAction`, `updateCartItemAction`, `removeCartItemAction` | cart | guest/customer | 30/min |
| `toggleWishlistAction` | cart | customer | 30/min |
| `saveAddressAction`, `deleteAddressAction` | users | customer | 10/min |
| `placeOrderAction` | orders | customer | 5/min/user |
| `cancelOrderAction` | orders | customer (seller/admin in Phases 6–7) — whole order, before any package ships | 5/min/IP |
| `createReviewAction` | reviews | customer — delivered item from own order, once per item | 5/min/IP |
| `applySellerAction` (verified customer), `updateShopAction`, `shopCoverAction` (approved seller, own shop) | sellers | customer/seller | 5/min/IP |
| `saveProductAction`, `productStatusAction` (submit · deactivate · reactivate), `uploadProductImageAction`, `productImageAction` (cover · remove), `stockChangeAction` (add · remove · set) | products / inventory | seller — own products only | 30/min/IP |
| `packageStepAction` (accept · pack · ready · cancel + reason), `recordSerialAction` | fulfilment | seller — own package only | 30/min/IP |
| `addTrackingCodeAction`, `adminPackageStepAction` (deliver + COD · return · cancel) | orders | admin (TOTP) | 60/min/IP |
| `decideSellerAction` (approve · reject), `moderateProductAction` (approve · return · block) | admin | admin (TOTP) | 60/min/IP |
| `customerStatusAction` (suspend · reactivate), `moderateReviewAction` (hide · show), `createPayoutAction`, `markPayoutPaidAction`; `decideSellerAction` also suspends / reinstates shops | admin | admin (TOTP) | 60/min/IP |
| `saveSettingsAction`, `saveCourierAction`, `saveBrandAction`, `saveCategoryAction` (with spec template) | admin | admin (TOTP) | 60/min/IP |

## 4. REST endpoints `/api/v1`

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/products` | public | filters: `category, brand, minPrice, maxPrice, condition, inStock, spec.<key>, sort, cursor` |
| GET | `/products/{slug}` | public | |
| GET | `/categories` · `/brands` | public | cached |
| GET | `/search?q=` | public | text search, 20/min/IP |
| GET | `/track?orderNo=&phone=` | public | returns status + tracking code + courier URL; 10/min/IP; phone must match |
| GET | `/me/orders` · `/me/orders/{orderNo}` | customer | own only |
| GET | `/seller/orders` · `/seller/products` · `/seller/reports` | seller | own only |
| GET | `/admin/orders` · `/admin/shipments/pending` · `/admin/reports` · `/admin/audit-logs` | admin | |
| POST | `/uploads/sign` | seller/admin/customer(avatar) | Upstash Blob upload handler (authorises + sets path); type + size limits |
| POST | `/auth/[...nextauth]` | Auth.js | managed by Auth.js |

## 5. Example — add tracking code

```http
POST (server action) addTrackingCodeAction
{ "orderNo": "TS-2026-000123", "packageId": "6720…", "courierId": "671f…",
  "trackingCode": "PX-7731 2093 LK", "handedOverAt": "2026-10-21T09:05:00+05:30", "notify": true }
```
Service steps: admin guard → load order → package must be `ready_to_ship` → validate code with `courier.codePattern` → build `trackingUrl` from the template → set `shipment`, status `shipped` → insert `order_events` → `audit.log('order.tracking.add')` → email/SMS customer.
