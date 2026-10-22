# Project structure

**DOC-04** · Feature-based structure. Routes in `app/`, logic in `modules/`, data in `db/`.

```text
teleshop/
├── .github/workflows/ci.yml   # lint, typecheck, unit, integration, build
├── assets-src/                # raw 3D sources (git-ignored); optimised .glb goes to public/models
├── docs/                      # this documentation + adr/ + phases/
├── public/
│   ├── models/                # hero-phone.glb, hero-pc.glb, hero-headset.glb (optimised)
│   └── images/placeholders/   # hero-*.webp posters, product fallback
├── scripts/
│   ├── python/                # fetch_product_images.py, optimize_images.py, requirements.txt
│   ├── seed/                  # seed.ts, indexes.ts, migrate.ts, seed-db.ts, data/catalog.ts
│   └── dev/                   # memory-db.ts (pnpm db:memory — local replica set)
├── src/
│   ├── app/
│   │   ├── (store)/           # /, /shop, /c/[slug], /p/[slug], /compare, /cart, /checkout,
│   │   │                      # /order/[no]/confirmed, /track, /s/[shop], /about, /contact, /help, /legal/*
│   │   ├── (auth)/            # /sign-in, /register, /register/seller, /forgot-password, /reset-password, /verify-email
│   │   ├── account/           # /account, /account/orders, /account/orders/[no], /account/wishlist,
│   │   │                      # /account/addresses, /account/reviews, /account/security
│   │   ├── seller/            # /seller, /seller/orders, /seller/products, /seller/products/[id],
│   │   │                      # /seller/inventory, /seller/payouts, /seller/settings
│   │   ├── admin/             # /admin, /admin/orders, /admin/orders/[no], /admin/shipments, /admin/products,
│   │   │                      # /admin/categories, /admin/brands, /admin/inventory, /admin/customers,
│   │   │                      # /admin/sellers, /admin/reviews, /admin/reports, /admin/couriers,
│   │   │                      # /admin/settings, /admin/audit-logs, /admin/login
│   │   ├── api/v1/            # REST route handlers (see doc 09) + api/auth/[...nextauth]
│   │   ├── layout.tsx · not-found.tsx · error.tsx · globals.css
│   ├── components/
│   │   ├── ui/                # Button, Badge, Input, Glass, Sheet, Tabs… + React Bits / ThreeUI wrappers
│   │   ├── layout/            # Navbar (guest/user), Footer, AccountSidebar, AdminSidebar, SellerSidebar
│   │   ├── product/           # ProductCard, Gallery, VariantPicker, SpecTable, PriceTag
│   │   ├── three/             # HeroModelSlider, ModelStage, useModelPreload (client only)
│   │   └── forms/             # AddressForm, FieldError, FormSubmit
│   ├── modules/<feature>/     # auth, users, sellers, catalog, inventory, cart, orders, fulfilment,
│   │   ├── schema.ts          #   shipments, payments, payouts, reviews, couriers, settings, reports, audit
│   │   ├── access.ts          #   each module has these files
│   │   ├── service.ts
│   │   ├── actions.ts
│   │   └── types.ts
│   ├── db/
│   │   ├── mongoose.ts        # cached connection + withTransaction()
│   │   ├── operators.ts       # trusted query operators ($in, $gt…) — sanitizeFilter is on
│   │   ├── models/            # one file per collection (see doc 08)
│   │   ├── repositories/      # queries + DTO mappers
│   │   └── migrations/        # 0001-init.ts, 0002-… (data migrations)
│   ├── lib/
│   │   ├── auth/              # auth.ts (Auth.js config), password.ts, totp.ts, session.ts, guards.ts
│   │   ├── security/          # headers.ts, csp.ts, rate-limit.ts, sanitize.ts, upload.ts
│   │   ├── validation/        # shared Zod helpers (objectId, phoneLK, money)
│   │   ├── cache/             # tags.ts (revalidateTag names)
│   │   └── utils/             # money.ts (cents ⇄ LKR), slug.ts, dates.ts
│   ├── config/                # env.ts (Zod-validated), site.ts, couriers.ts
│   ├── hooks/ · types/
│   ├── styles/                # tokens.css (Midnight Tech), glass.css
│   └── middleware.ts
├── tests/
│   ├── fixtures/              # pure DTO fixtures built from the seed catalogue
│   ├── support/               # env setup, in-memory replica set, connectTestDatabase()
│   ├── unit/                  # services, schemas, utils, data-model-doc.test.ts
│   ├── integration/           # repositories + actions against mongodb-memory-server
│   └── e2e/                   # Playwright: checkout, tracking, seller fulfilment, admin tracking code
├── CLAUDE.md · README.md · .env.example
└── next.config.ts · tsconfig.json · vitest.config.ts · playwright.config.ts
```

## Naming rules
- Files `kebab-case.ts`; React components `PascalCase.tsx`; one component per file.
- Models `product.model.ts` exporting `ProductModel` and type `ProductDoc`.
- Repositories `product.repository.ts`; DTOs `ProductDTO`.
- Server Actions end with `Action`: `placeOrderAction`, `addTrackingCodeAction`.
- Cache tags in `lib/cache/tags.ts` only — never inline strings.

## Where does it go?

| You are adding… | Put it in |
| --- | --- |
| A new page | `src/app/<area>/…/page.tsx` |
| A business rule | `src/modules/<feature>/service.ts` |
| A form's validation | `src/modules/<feature>/schema.ts` (reuse on client + server) |
| A new query | `src/db/repositories/<entity>.repository.ts` |
| A field or index | `src/db/models/<entity>.model.ts` **and** `docs/08-data-model.md` |
| A reusable visual piece | `src/components/ui` or `components/<area>` |
| Anything 3D | `src/components/three` |
