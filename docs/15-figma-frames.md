# Figma frames → routes

**DOC-15** · Figma file: *Teleshop E-Commerce Website* (`ZCxOurbPdBvU7ACxctd97Z`). Route folders live in `src/app/` (see [doc 04](04-project-structure.md)).

> Theme: dark **Midnight Tech** (primary `#1D4ED8`, accent `#F59E0B`). Colours are Figma variables in the **Teleshop Colors** collection — match them to `src/styles/tokens.css`.

## How to use with Claude Code

- Give Claude the link for the route you are building, e.g. *“Build `/p/[slug]` to match <link>. Use our tokens and components.”*
- With the Figma MCP connected, Claude can read the frame directly from the link (`node-id`).
- Build the **desktop** frame first, then make it responsive using the matching **M** (mobile) frame.

## Route list (copy-paste block)

```text
# Storefront — desktop
/                                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-307
/shop · /c/[slug]                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=9-161
/p/[slug]                                  → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=9-849
/cart                                      → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-443
/checkout                                  → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-788
/order/[no]/confirmed                      → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-1146
/track                                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1926
/s/[shop]                                  → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2060
/compare                                   → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2541
/about                                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-1496
/contact                                   → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-1810
/help                                      → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-2114
/legal/terms · /legal/privacy              → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-2417

# Auth — desktop
/sign-in                                   → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-887
/register                                  → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1022
/register/seller                           → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1183
/forgot-password · /reset-password         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1347

# Account — desktop
/account · /account/security               → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1484
/account/orders                            → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1059
/account/orders/[no]                       → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1507
/account/wishlist                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2966
/account/addresses                         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-3382

# Mobile (same routes, < 768 px)
/ (mobile)                                 → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-2648
menu drawer (navbar)                       → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-2921
/p/[slug] (mobile)                         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3079
/cart (mobile)                             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3204
/account/orders/[no] (mobile)              → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3307
/sign-in (mobile)                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3461
/checkout (mobile)                         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2663
/register (mobile)                         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2775
/account (mobile)                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2857
/account/orders (mobile)                   → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-3012

# Admin — desktop
/admin/login                               → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-1496
/admin                                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-1585
/admin/orders · /admin/shipments           → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-2049
/admin/orders/[no]                         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-2660
/admin/products                            → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-1528
/admin/products/[id]                       → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-2141
/admin/categories · /admin/brands          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-2585
/admin/inventory                           → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-3251
/admin/customers                           → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-1548
/admin/sellers                             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-1999
/admin/reviews                             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-2383
/admin/reports                             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-2722
/admin/couriers · /admin/settings          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-3065
/admin/audit-logs                          → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-3401

# Admin — mobile
/admin (mobile)                            → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=27-2756
/admin/orders (mobile)                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=64-2762
/admin/orders/[no] tracking sheet (mobile) → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=64-2884

# Seller portal — desktop
/seller                                    → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=65-2773
/seller/orders                             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=65-3155
/seller/products · /seller/inventory       → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=66-2779
/seller/payouts · /seller/settings         → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=66-3221
```

## Design system

```text
Design tokens — colours              → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-8
Design tokens — typography           → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-61
Buttons & badges                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-67
Components (Logo, Navbar, Footer)    → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-96
Navbar component (Guest / Logged in) → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-214
Footer component                     → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-215
Logo component                       → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-97
Whole design system page             → https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-3
```

## Full table

| Area | Route | Figma frame | Link |
| --- | --- | --- | --- |
| Storefront — desktop | `/` | 01 · Home — Guest | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=7-307) |
| Storefront — desktop | `/shop · /c/[slug]` | 02 · Shop — Category Listing | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=9-161) |
| Storefront — desktop | `/p/[slug]` | 03 · Product Details | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=9-849) |
| Storefront — desktop | `/cart` | 04 · Shopping Cart | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-443) |
| Storefront — desktop | `/checkout` | 05 · Checkout | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-788) |
| Storefront — desktop | `/order/[no]/confirmed` | 06 · Order Confirmation | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=10-1146) |
| Storefront — desktop | `/track` | 14 · Track Order — Guest Lookup | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1926) |
| Storefront — desktop | `/s/[shop]` | 19 · Seller Shop Page | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2060) |
| Storefront — desktop | `/compare` | 20 · Compare Products | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2541) |
| Storefront — desktop | `/about` | 15 · About Us | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-1496) |
| Storefront — desktop | `/contact` | 16 · Contact Us | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-1810) |
| Storefront — desktop | `/help` | 17 · Help Centre & FAQ | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-2114) |
| Storefront — desktop | `/legal/terms · /legal/privacy` | 18 · Info — Terms & Privacy | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=20-2417) |
| Auth — desktop | `/sign-in` | 07 · Sign In | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-887) |
| Auth — desktop | `/register` | 08 · Register — Customer | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1022) |
| Auth — desktop | `/register/seller` | 09 · Register — Seller | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1183) |
| Auth — desktop | `/forgot-password · /reset-password` | 10 · Forgot Password | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1347) |
| Account — desktop | `/account · /account/security` | 11 · My Account — Overview & Profile | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=11-1484) |
| Account — desktop | `/account/orders` | 12 · My Orders | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1059) |
| Account — desktop | `/account/orders/[no]` | 13 · Order Details & Tracking | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=12-1507) |
| Account — desktop | `/account/wishlist` | 21 · Wishlist | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-2966) |
| Account — desktop | `/account/addresses` | 22 · Saved Addresses | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=22-3382) |
| Mobile (same routes, < 768 px) | `/ (mobile)` | M1 · Mobile — Home | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-2648) |
| Mobile (same routes, < 768 px) | `menu drawer (navbar)` | M2 · Mobile — Menu Drawer | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-2921) |
| Mobile (same routes, < 768 px) | `/p/[slug] (mobile)` | M3 · Mobile — Product Details | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3079) |
| Mobile (same routes, < 768 px) | `/cart (mobile)` | M4 · Mobile — Cart | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3204) |
| Mobile (same routes, < 768 px) | `/account/orders/[no] (mobile)` | M5 · Mobile — Order Tracking | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3307) |
| Mobile (same routes, < 768 px) | `/sign-in (mobile)` | M6 · Mobile — Sign In | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=24-3461) |
| Mobile (same routes, < 768 px) | `/checkout (mobile)` | M7 · Mobile — Checkout | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2663) |
| Mobile (same routes, < 768 px) | `/register (mobile)` | M8 · Mobile — Register | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2775) |
| Mobile (same routes, < 768 px) | `/account (mobile)` | M9 · Mobile — My Account | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-2857) |
| Mobile (same routes, < 768 px) | `/account/orders (mobile)` | M10 · Mobile — My Orders | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=26-3012) |
| Admin — desktop | `/admin/login` | A1 · Admin Login (2FA) | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-1496) |
| Admin — desktop | `/admin` | A2 · Dashboard Overview | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-1585) |
| Admin — desktop | `/admin/orders · /admin/shipments` | A3 · Orders — Management | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-2049) |
| Admin — desktop | `/admin/orders/[no]` | A4 · Order Detail — Courier & Tracking | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=15-2660) |
| Admin — desktop | `/admin/products` | A5 · Products — Catalog | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-1528) |
| Admin — desktop | `/admin/products/[id]` | A6 · Add / Edit Product | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-2141) |
| Admin — desktop | `/admin/categories · /admin/brands` | A7 · Categories & Brands | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-2585) |
| Admin — desktop | `/admin/inventory` | A8 · Inventory | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=17-3251) |
| Admin — desktop | `/admin/customers` | A9 · Customers | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-1548) |
| Admin — desktop | `/admin/sellers` | A10 · Sellers — Approvals | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-1999) |
| Admin — desktop | `/admin/reviews` | A11 · Reviews — Moderation | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-2383) |
| Admin — desktop | `/admin/reports` | A12 · Reports & Analytics | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-2722) |
| Admin — desktop | `/admin/couriers · /admin/settings` | A13 · Couriers & Settings | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-3065) |
| Admin — desktop | `/admin/audit-logs` | A14 · Audit Logs | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=18-3401) |
| Admin — mobile | `/admin (mobile)` | AM1 · Admin Mobile — Dashboard | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=27-2756) |
| Admin — mobile | `/admin/orders (mobile)` | AM2 · Admin Mobile — Orders | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=64-2762) |
| Admin — mobile | `/admin/orders/[no] tracking sheet (mobile)` | AM3 · Admin Mobile — Add Tracking Code | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=64-2884) |
| Seller portal — desktop | `/seller` | S1 · Seller — Dashboard | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=65-2773) |
| Seller portal — desktop | `/seller/orders` | S2 · Seller — Orders & Fulfilment | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=65-3155) |
| Seller portal — desktop | `/seller/products · /seller/inventory` | S3 · Seller — Products & Stock | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=66-2779) |
| Seller portal — desktop | `/seller/payouts · /seller/settings` | S4 · Seller — Payouts & Shop Settings | [open](https://www.figma.com/design/ZCxOurbPdBvU7ACxctd97Z/Teleshop-E-Commerce-Website?node-id=66-3221) |

Not routes: the `MOBILE`, `ADMIN MOBILE` and `SELLER PORTAL` label frames are just section headings on the canvas.
