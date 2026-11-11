# Project file and folder guide

This is a quick map of the Teleshop repository: start with the root, then use the
section for the area you are working on. It describes the checked-in project
files and notes local-only source/generated folders where relevant. Generated
folders such as `node_modules/`, `.next/` and `test-results/` are not source
files and are intentionally not listed file by file. Repeated image variants
are explained by their naming convention.

## 1. Root folders and files

Teleshop is a Next.js marketplace. `src/app/` supplies pages and route handlers,
`src/modules/` implements business features, `src/db/` owns MongoDB access, and
`src/components/` contains the UI. `scripts/` supports development and data
operations; `public/` serves static assets; `docs/` explains the product and
engineering decisions; `tests/` verifies behavior.

### Root folders

| Folder | What it contains / does |
| --- | --- |
| `.github/` | GitHub automation and dependency-update settings: `dependabot.yml` configures dependency update PRs; `workflows/ci.yml` runs CI checks. |
| `.husky/` | Git hooks: `commit-msg` validates commit messages; `pre-commit` runs staged-file checks. |
| `assets-src/` | Local original 3D source assets, when present; optimized models used by the site are in `public/models/`. |
| `docs/` | Product, design, architecture, data, API, security, testing, deployment, decision and phase documentation. |
| `public/` | Static images and 3D models served directly by Next.js. |
| `scripts/` | Database seed/migration utilities, local development helpers and image preparation scripts. |
| `src/` | Application pages, UI, business logic, database code, configuration and shared utilities. |
| `tests/` | Unit, integration and browser end-to-end tests, plus their fixtures and support. |

### Root files

| File | What it does |
| --- | --- |
| `.env.example` | Names the environment variables developers need to configure; values should be supplied locally. |
| `.gitattributes` | Git attributes such as text-file normalization. |
| `.gitignore` | Excludes dependencies, local secrets, generated output and other non-source files from Git. |
| `.prettierignore` | Excludes files and generated directories from formatting. |
| `.prettierrc.json` | Shared Prettier formatting rules. |
| `README.md` | Project introduction and the main setup/usage entry point. |
| `RULES.md` | Project-specific implementation and contribution rules. |
| `commitlint.config.mjs` | Checks commit messages against the repository's commit convention. |
| `eslint.config.mjs` | ESLint rules for JavaScript, TypeScript and Next.js code. |
| `next-env.d.ts` | Next.js-generated TypeScript declarations; normally maintained by Next.js. |
| `next.config.ts` | Next.js build/runtime configuration, including image and framework settings. |
| `package.json` | Project dependencies and commands for development, builds, tests, linting and database tasks. |
| `playwright.config.ts` | Playwright browser-test configuration. |
| `pnpm-lock.yaml` | Exact dependency versions installed by pnpm. |
| `pnpm-workspace.yaml` | Declares the pnpm workspace/package-manager configuration. |
| `postcss.config.mjs` | Connects PostCSS to the CSS/Tailwind processing setup. |
| `tsconfig.json` | TypeScript compiler options and source aliases. |
| `tsconfig.tsbuildinfo` | TypeScript incremental-build cache; generated, not application logic. |
| `vercel.json` | Vercel deployment settings, including the scheduled auto-cancel job. |
| `vitest.config.mts` | Vitest projects and setup for unit and integration tests. |

## 2. Documentation (`docs/`)

| File | What it explains |
| --- | --- |
| `00-index.md` | Documentation starting point and reading order. |
| `01-project-overview.md` | Marketplace problem, user roles, scope and order lifecycle. |
| `02-architecture.md` | Application components and how they communicate. |
| `03-tech-stack.md` | Main libraries, hosted services and technology choices. |
| `04-project-structure.md` | Where code belongs and how the source folders are organized. |
| `05-design-system.md` | Colors, typography, components, accessibility and motion rules. |
| `06-3d-hero.md` | Home-page 3D hero behavior and its models. |
| `07-product-images.md` | Product image sources, preparation and use. |
| `08-data-model.md` | MongoDB collections, fields and relationships. |
| `09-api.md` | Server Actions, REST endpoints, limits and scheduled work. |
| `10-security.md` | Authentication, authorization, security headers, uploads and data protections. |
| `11-testing.md` | Test types and how to run them. |
| `12-deployment.md` | Hosting, environment setup and release requirements. |
| `13-phases.md` | Planned delivery phases and their status/scope. |
| `14-claude-code-workflow.md` | Repository workflow notes for Claude Code. |
| `15-figma-frames.md` | Design-file frame references. |
| `16-project-file-guide.md` | This file-by-file and folder-by-folder map. |

### `docs/adr/` — architecture decision records

Each ADR captures a decision and its trade-offs rather than describing page behavior.

| File | Decision |
| --- | --- |
| `ADR-001-mongodb-atlas.md` | MongoDB Atlas as the database. |
| `ADR-002-nextjs-vercel.md` | Next.js and Vercel as the web application and hosting approach. |
| `ADR-003-auth.md` | Authentication approach. |
| `ADR-004-3d-hero.md` | The 3D hero approach. |
| `ADR-005-upstash-blob.md` | Upstash Blob for file/object storage. |
| `ADR-006-encrypted-seller-documents.md` | Encryption and handling of seller verification documents. |

### `docs/phases/` — implementation phase notes

| File | Main subject |
| --- | --- |
| `phase-0-foundation.md` | Initial project setup and foundation. |
| `phase-1-data-layer.md` | Database and data access. |
| `phase-2-auth.md` | Accounts and authentication. |
| `phase-3-storefront.md` | Customer storefront and catalogue. |
| `phase-4-checkout.md` | Cart and checkout. |
| `phase-5-tracking.md` | Order and delivery tracking. |
| `phase-6-seller.md` | Seller portal and fulfilment. |
| `phase-7-admin.md` | Administration tools. |
| `phase-8-hardening.md` | Security and reliability hardening. |
| `phase-9-launch.md` | Launch preparation. |

## 3. Static content (`public/`) and source assets (`assets-src/`)

Files in `public/` are browser-accessible static files. Do not put credentials or
private documents there.

| Path | What it contains / does |
| --- | --- |
| `public/images/brand/` | Teleshop logos and marks (`teleshop-logo-full*.png`, `teleshop-mark*.png`); variants are sized/source versions for different UI uses. |
| `public/images/icons/` | `facebook.svg`, `instagram.svg`, `linkedin.svg`, `youtube.svg` social icons. |
| `public/images/placeholders/` | Placeholder-image location; `.gitkeep` keeps the otherwise-empty folder in Git. |
| `public/images/products/` | WebP product gallery images. Each `<product-slug>-<number>.webp` belongs to that product; the number distinguishes gallery images. |
| `public/images/sellers/` | WebP shop/seller photos. `<shop-slug>-<number>.webp` identifies the shop and image variant. |
| `public/models/` | Optimized 3D models loaded by the home-page hero. |
| `public/models/hero-headset.glb` | Headset hero model. |
| `public/models/hero-laptop.glb` | Laptop/PC hero model. |
| `public/models/hero-phone.glb` | Phone hero model. |
| `public/models/README.md` | Notes about the public model assets. |
| `public/models/CREDITS.md` | Attribution/licence credits for the model assets. |
| `public/models/.gitkeep` | Keeps the model directory present when it has no tracked model files. |
| `assets-src/headset.glb` | Original headset model source. |
| `assets-src/models/iphone_17_pro.glb` | Original iPhone model source. |
| `assets-src/models/macbook_pro_m3.glb` | Original MacBook model source. |
| `assets-src/phone/iphone_17_pro.gltf` | Original glTF phone model source. |

`assets-src/` is local source material and is not part of the checked-in asset
list; the browser-facing, optimized hero files belong in `public/models/`. The
`-1`, `-2`, etc. suffix in product and seller
images indicates separate images in a gallery, not different products/shops.

## 4. Development and data scripts (`scripts/`)

### `scripts/dev/`

| File | What it does |
| --- | --- |
| `memory-db.ts` | Starts a local MongoDB replica set for development (`pnpm db:memory`). |
| `vercel-preview-env.mjs` | Helps prepare environment values for a Vercel preview deployment. |

### `scripts/python/`

| File | What it does |
| --- | --- |
| `config.py` | Shared paths and settings for image preparation scripts. |
| `fetch_commons_images.py` | Fetches selected image assets from Wikimedia Commons. |
| `fetch_product_images.py` | Fetches product images from the configured product list. |
| `optimize_images.py` | Resizes/converts prepared images for use by the site. |
| `requirements.txt` | Python package requirements for these scripts. |
| `input/commons-picks.csv` | Chosen Commons image records. |
| `input/commons-queries.csv` | Search terms for Commons image discovery. |
| `input/keep-background.txt` | Image names that should retain their backgrounds during preparation. |
| `input/products.example.csv` | Example product image input format. |
| `input/seller-picks.csv` | Chosen seller/shop image records. |
| `input/seller-queries.csv` | Search terms for seller image discovery. |
| `output/` | Destination for generated image files; generated outputs are not source logic. |

### `scripts/seed/`

| File | What it does |
| --- | --- |
| `README.md` | Instructions and safety notes for database seed scripts. |
| `data/catalog.ts` | Demo catalogue data loaded by the seed process. |
| `indexes.ts` | Creates or checks MongoDB indexes. |
| `load-env.ts` | Loads and validates the database environment for scripts. |
| `migrate.ts` | Applies registered database migrations. |
| `seed-db.ts` | Database-level seed operations. |
| `seed.ts` | Main command-line entry point for seeding demo data. |
| `set-password-db.ts` | Database helpers for setting a password. |
| `set-password.ts` | Command-line entry point for setting a user's password. |

## 5. Application (`src/`)

### `src/app/` — pages and route handlers

Next.js uses folders and `page.tsx` files to create routes. Parenthesized folder
names such as `(store)` and `(auth)` organize routes without appearing in URLs;
bracketed names such as `[slug]` are dynamic URL values.

| Path/file | What it does |
| --- | --- |
| `src/app/layout.tsx` | Root HTML document, global providers and shared page shell. |
| `src/app/globals.css` | Global CSS entry point and imported styles. |
| `src/app/error.tsx` | Application-level error boundary UI. |
| `src/app/not-found.tsx` | Not-found page. |
| `src/app/robots.ts` | Generates crawler rules. |
| `src/app/sitemap.ts` | Generates the site sitemap. |
| `src/app/icon.png`, `src/app/apple-icon.png` | Browser and Apple home-screen icons. |
| `src/app/(auth)/auth-features.ts` | Shared configuration/content for authentication screens. |
| `src/app/(auth)/sign-in/page.tsx` | Sign-in page. |
| `src/app/(auth)/register/page.tsx` | Customer registration page. |
| `src/app/(auth)/register/seller/page.tsx` | Seller registration/application page. |
| `src/app/(auth)/forgot-password/page.tsx` | Starts password recovery. |
| `src/app/(auth)/reset-password/page.tsx` | Completes password recovery. |
| `src/app/(auth)/verify-email/page.tsx` | Email verification page. |
| `src/app/(store)/layout.tsx` | Shared storefront layout and navigation. |
| `src/app/(store)/page.tsx` | Home page. |
| `src/app/(store)/shop/page.tsx` | Product catalogue and filters. |
| `src/app/(store)/c/[slug]/page.tsx` | Category listing page. |
| `src/app/(store)/p/[slug]/page.tsx` | Product detail page. |
| `src/app/(store)/s/[shop]/page.tsx` | Seller shop page. |
| `src/app/(store)/sellers/page.tsx` | Seller directory/listing page. |
| `src/app/(store)/deals/page.tsx` | Deals/promotions page. |
| `src/app/(store)/compare/page.tsx` | Product comparison page. |
| `src/app/(store)/cart/page.tsx` | Shopping cart page. |
| `src/app/(store)/checkout/page.tsx` | Checkout page. |
| `src/app/(store)/track/page.tsx` | Guest order tracking page. |
| `src/app/(store)/about/page.tsx`, `contact/page.tsx`, `help/page.tsx` | About, contact and help information pages. |
| `src/app/(store)/credits/page.tsx` | Asset and content credits page. |
| `src/app/(store)/legal/[doc]/page.tsx` | Displays the selected legal document. |
| `src/app/(store)/loading.tsx` | Storefront loading UI. |
| `src/app/account/layout.tsx` | Shared signed-in customer account layout. |
| `src/app/account/page.tsx` | Account overview. |
| `src/app/account/addresses/page.tsx` | Saved delivery addresses. |
| `src/app/account/orders/page.tsx` | Customer order list. |
| `src/app/account/orders/[orderNo]/page.tsx` | Details for one customer order. |
| `src/app/account/wishlist/page.tsx` | Customer wishlist. |
| `src/app/seller/layout.tsx` | Shared seller portal layout and access boundary. |
| `src/app/seller/page.tsx` | Seller dashboard. |
| `src/app/seller/products/page.tsx`, `products/new/page.tsx`, `products/[id]/page.tsx` | Seller product list, creation form and edit page. |
| `src/app/seller/inventory/page.tsx` | Seller stock management. |
| `src/app/seller/orders/page.tsx`, `orders/[orderNo]/page.tsx` | Seller order list and package/order details. |
| `src/app/seller/payouts/page.tsx` | Seller payout summary. |
| `src/app/seller/settings/page.tsx` | Seller shop settings. |
| `src/app/admin/login/page.tsx` | Admin sign-in/second-factor entry. |
| `src/app/admin/(console)/layout.tsx` | Shared admin console layout and access boundary. |
| `src/app/admin/(console)/page.tsx` | Admin dashboard. |
| `src/app/admin/(console)/orders/page.tsx`, `orders/[orderNo]/page.tsx` | Admin order list and details. |
| `src/app/admin/(console)/products/page.tsx`, `products/[id]/page.tsx` | Product moderation list and details. |
| `src/app/admin/(console)/catalog/page.tsx` | Catalogue administration. |
| `src/app/admin/(console)/catalog/categories/new/page.tsx`, `categories/[id]/page.tsx` | Create/edit category pages. |
| `src/app/admin/(console)/inventory/page.tsx` | Admin inventory view. |
| `src/app/admin/(console)/customers/page.tsx` | Customer administration. |
| `src/app/admin/(console)/sellers/page.tsx`, `sellers/[sellerId]/page.tsx` | Seller review list and seller details. |
| `src/app/admin/(console)/sellers/[sellerId]/document/route.ts` | Authorized route for retrieving a seller verification document. |
| `src/app/admin/(console)/reviews/page.tsx` | Review moderation. |
| `src/app/admin/(console)/payouts/page.tsx` | Payout administration. |
| `src/app/admin/(console)/reports/page.tsx` | Admin reports. |
| `src/app/admin/(console)/settings/page.tsx` | Site and operational settings. |
| `src/app/admin/(console)/audit-log/page.tsx` | Security/administrative audit history. |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API endpoint. |
| `src/app/api/cron/auto-cancel/route.ts` | Protected Vercel Cron endpoint for automatic cancellation of unaccepted orders. |
| `src/app/api/v1/.gitkeep` | Keeps the planned/versioned REST API directory in Git; currently no tracked v1 route files here. |
| `src/app/dev/ui/page.tsx` | Development-only UI/component preview page. |
| `src/app/fonts/README.md` | Notes about the locally hosted fonts. |
| `src/app/fonts/inter-latin-var.woff2` | Self-hosted Inter variable font. |
| `src/app/fonts/space-grotesk-latin-var.woff2` | Self-hosted Space Grotesk variable font. |

### `src/components/` — reusable interface components

| Folder / files | What they do |
| --- | --- |
| `admin/` — `AdminSidebar.tsx`, `CategoryEditor.tsx`, `ConfigForms.tsx`, `CreatePayoutButton.tsx`, `DecisionForm.tsx`, `DoneBanner.tsx`, `PackageAdminActions.tsx`, `Pager.tsx`, `TrackingPanel.tsx` | Admin navigation, catalogue/configuration forms, seller/product decisions, order controls, pagination, and tracking UI. |
| `cart/CartView.tsx` | Cart display and item interactions. |
| `checkout/CheckoutForm.tsx` | Customer checkout form. |
| `forms/` — `AccountForms.tsx`, `AddressForm.tsx`, `AuthForms.tsx`, `AvatarForm.tsx`, `ContactForm.tsx`, `TwoFactorForms.tsx`, `fields.tsx` | Reusable account, address, login/registration, avatar, contact and two-factor forms/fields. `.gitkeep` reserves the folder. |
| `home/` — `CategoryGrid.tsx`, `FeaturedProducts.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Newsletter.tsx`, `PromoBanners.tsx`, `TopBrands.tsx`, `TrustStrip.tsx` | Home page hero and content sections. |
| `layout/` — `AccountSidebar.tsx`, `AuthShell.tsx`, `BottomTabBar.tsx`, `CartCount.tsx`, `CategoriesMenu.tsx`, `Footer.tsx`, `Logo.tsx`, `MobileMenu.tsx`, `NavLinks.tsx`, `Navbar.tsx`, `SplashScreen.tsx`, `nav-user.ts`, `types.ts` | Shared site navigation, responsive layout, account navigation, user navigation state and related types. `.gitkeep` preserves the folder. |
| `orders/` — `CancelOrderForm.tsx`, `PackageTimeline.tsx`, `StatusStepper.tsx`, `TrackForm.tsx`, `TrackingCodeBox.tsx`, `order-status.ts` | Order cancellation, timeline/status and tracking UI plus status display helpers. |
| `product/` — `CategoryIcon.tsx`, `FilterForm.tsx`, `PriceTag.tsx`, `ProductArt.tsx`, `ProductCard.tsx`, `ProductGallery.tsx`, `ProductListing.tsx`, `PurchasePanel.tsx`, `Rating.tsx`, `SellerCard.tsx`, `SortSelect.tsx`, `WishlistSync.tsx`, `WishlistToggle.tsx`, `listing-href.ts`, `variant-select.ts` | Catalogue/product cards, images, filters, purchasing, seller/rating display, wishlist behavior, and listing/variant helpers. `.gitkeep` preserves the folder. |
| `reviews/` — `ReviewForm.tsx`, `ReviewList.tsx` | Customer review form and review display. |
| `seller/` — `PackageActions.tsx`, `SellerSidebar.tsx`, `SerialForm.tsx`, `ShopSettingsForm.tsx`, `products/ProductForm.tsx`, `ProductImages.tsx`, `ProductStatusBar.tsx`, `StockRow.tsx`, `products/product-status.ts`, `seller-status.ts` | Seller navigation, order fulfilment, serial capture, shop settings and product/stock management. |
| `shop/ShopMap.tsx` | Shop location/map display. |
| `three/` — `FitToSize.tsx`, `HeroModelSlider.tsx`, `HeroScene.tsx`, `hero-slides.ts`, `models/GltfModel.tsx`, `models/ProceduralPhone.tsx`, `pc/Fan.tsx`, `GamingPC.tsx`, `Glow.tsx`, `rgb-store.ts` | Client-side 3D hero scene, model loading/fitting, phone fallback, PC parts and RGB state. `.gitkeep` preserves the folder. |
| `ui/` — `Badge.tsx`, `Breadcrumbs.tsx`, `Button.tsx`, `GlassPanel.tsx`, `InfoPage.tsx`, `Input.tsx`, `SectionHeader.tsx` | Small shared visual primitives used across pages. `.gitkeep` preserves the folder. |

### `src/config/` — application configuration

| File | What it does |
| --- | --- |
| `couriers.ts` | Courier definitions and tracking-link configuration. |
| `demo-shops.ts` | Demo shop content/configuration. |
| `districts.ts` | Sri Lankan district/location choices. |
| `env.ts` | Validates and exposes server/public environment variables. |
| `model-credits.ts` | 3D model attribution data. |
| `product-image-credits.ts` | Product image attribution data. |
| `product-images.ts` | Demo product image mappings. |
| `seller-photo-credits.ts` | Seller/shop image attribution data. |
| `site.ts` | Site-wide name, URL and public metadata settings. |
| `storage.ts` | Allowed public Blob hostname and map tile host constants. `.gitkeep` reserves the config folder. |

### `src/db/` — persistence

| Path / files | What they do |
| --- | --- |
| `mongoose.ts` | Connects to MongoDB and provides transaction support. |
| `operators.ts` | Defines trusted query operators used with MongoDB filters. |
| `migrations/types.ts` | Type contract for versioned `up`/`down` database migrations. |
| `migrations/index.ts` | Registers migrations for execution. |
| `migrations/0001-init.ts` | Initial database setup/data migration. |
| `migrations/0002-validators.ts` | Adds or updates database validators. |
| `migrations/0003-seed-couriers-settings.ts` | Seeds default courier and settings records. |
| `migrations/0004-demo-product-images.ts` | Updates demo product image references. |
| `migrations/0005-demo-product-photo-sets.ts` | Adds/updates demo product image sets. |
| `migrations/0006-demo-shop-profiles.ts` | Adds demo shop profile data. |
| `migrations/0007-fill-missing-shop-fields.ts` | Fills missing shop fields in existing data. |
| `migrations/0008-order-item-serial-numbers.ts` | Adds serial-number support to order items. |
| `models/_shared.ts`, `models/index.ts` | Shared model definitions/helpers and model exports. |
| `models/account.model.ts`, `address.model.ts`, `audit-log.model.ts` | Authentication accounts, saved addresses and audit records. |
| `models/brand.model.ts`, `category.model.ts`, `product.model.ts` | Catalogue brands, categories and products. |
| `models/cart.model.ts`, `wishlist.model.ts` | Persisted customer cart and wishlist data. |
| `models/counter.model.ts` | Counters used to generate sequential identifiers. |
| `models/courier.model.ts` | Courier and tracking configuration data. |
| `models/inventory.model.ts` | Product stock and inventory data. |
| `models/order.model.ts`, `order-event.model.ts` | Orders/packages and their status event history. |
| `models/password-reset.model.ts`, `verification-token.model.ts` | Password reset and email verification tokens. |
| `models/payment.model.ts`, `payout.model.ts` | COD payment records and seller payouts. |
| `models/review.model.ts` | Product reviews. |
| `models/seller.model.ts` | Seller/shop profile and verification data. |
| `models/settings.model.ts` | Marketplace settings. |
| `models/user.model.ts` | Customer/admin user records. |
| `repositories/` | Database query and mapping layer; application services use repositories rather than accessing Mongoose directly. |
| `repositories/account.repository.ts`, `address.repository.ts`, `user.repository.ts` | Account, address and user queries. |
| `repositories/auth-token.repository.ts` | Verification and password-reset token queries. |
| `repositories/admin-catalog.repository.ts`, `admin-config.repository.ts`, `admin-order.repository.ts`, `admin-people.repository.ts` | Admin catalogue, settings, orders and people queries. |
| `repositories/audit-log.repository.ts` | Audit history queries. |
| `repositories/brand.repository.ts`, `category.repository.ts`, `product.repository.ts`, `catalog-mappers.ts`, `storefront-filter.ts` | Catalogue queries, DTO mapping and storefront filter construction. |
| `repositories/cart.repository.ts`, `wishlist.repository.ts` | Customer cart and wishlist queries. |
| `repositories/checkout.repository.ts` | Data operations needed to validate and create checkout orders. |
| `repositories/courier.repository.ts`, `order-status.repository.ts`, `order.repository.ts` | Courier and order/status operations. |
| `repositories/payment.repository.ts`, `payout.repository.ts` | Payment and payout queries. |
| `repositories/review.repository.ts` | Review queries. |
| `repositories/seller-order.repository.ts`, `seller-product.repository.ts`, `seller-shop.repository.ts`, `seller.repository.ts` | Seller-scoped order, product, shop and seller queries. |
| `repositories/settings.repository.ts` | Marketplace setting queries. |

### `src/lib/` — shared server and utility code

| Folder / files | What they do |
| --- | --- |
| `auth/` — `auth.config.ts`, `authorize.ts`, `breached.ts`, `claims.ts`, `guards.ts`, `index.ts`, `password.ts`, `route-access.ts`, `tokens.ts`, `totp.ts` | Auth.js setup, permission checks, password security, user claims, tokens, route access and TOTP two-factor helpers. |
| `cache/.gitkeep` | Reserves the cache utility folder. |
| `documents/business-document.ts` | Validates/handles seller business-document input. |
| `email/send.ts` | Sends application email. |
| `geo/tiles.ts` | Builds/handles map tile URLs for shop maps. |
| `images/avatar.ts`, `images/product.ts` | Validates/processes avatar and product image uploads, including image re-encoding. |
| `security/action-limit.ts` | Applies per-user/per-IP Server Action rate-limit policy. |
| `security/client-ip.ts` | Obtains the client IP for guest security controls. |
| `security/cron-auth.ts` | Verifies authorization for scheduled-job routes. |
| `security/doc-crypto.ts` | Encrypts/decrypts seller documents with authenticated AES-256-GCM. |
| `security/headers.ts` | Defines security headers and Content Security Policy. `.gitkeep` reserves the security folder. |
| `security/rate-limit.ts` | Shared rate limiting through Upstash Redis, with local in-memory fallback. |
| `storage/blob.ts` | Central Upstash Blob adapter for storing, reading, and deleting objects. |
| `storage/documents.ts` | Stores seller documents as encrypted objects and decrypts them for authorized use. |
| `utils/cn.ts` | Combines CSS class names. |
| `utils/money.ts` | Money/cents formatting and conversion helpers. |
| `utils/strings.ts` | Shared string helpers. `.gitkeep` reserves the utils folder. |
| `validation/common.ts`, `form.ts`, `serial.ts` | Shared Zod/form and serial-number validation helpers. `.gitkeep` reserves the validation folder. |

### `src/modules/` — business features

Pages and components should use these modules for feature rules. The common
pattern is `schema.ts` (input validation), `access.ts` (permissions),
`actions.ts` (server entry points), `service.ts` (business rules), and `types.ts`
(feature types). Some features use only the files they need.

| Module folder | Responsibility and files |
| --- | --- |
| `addresses/` | Customer addresses: `access.ts`, `actions.ts`, `schema.ts`, `service.ts`, `types.ts`. |
| `admin/` | Admin operations: `actions.ts`, `audit-groups.ts`, `config-actions.ts`, `config-schema.ts`, `config.ts`, `emails.ts`, `people.ts`, `service.ts`, `session.ts`, `types.ts`. |
| `audit/` | Audit recording: `service.ts`. |
| `auth/` | Registration, sign-in, email/password flows and two-factor: `access.ts`, `actions.ts`, `emails.ts`, `schema.ts`, `service.ts`, `two-factor-actions.ts`, `two-factor.ts`, `types.ts`. |
| `cart/` | Cart synchronization and pricing: `actions.ts`, `merge.ts`, `pricing.ts`, `saved-cart.ts`, `schema.ts`, `service.ts`, `types.ts`. |
| `catalog/` | Public catalogue/search/filter rules: `schema.ts`, `service.ts`, `types.ts`. |
| `couriers/` | Reserved feature folder for courier behavior; currently contains only `.gitkeep`. |
| `fulfilment/` | Seller order/package fulfilment: `access.ts`, `actions.ts`, `emails.ts`, `schema.ts`, `seller.ts`, `service.ts`, `tabs.ts`, `types.ts`. |
| `inventory/` | Reserved feature folder for inventory behavior; currently contains only `.gitkeep`. |
| `marketing/` | Contact/marketing actions and validation: `actions.ts`, `contact.ts`, `schema.ts`. |
| `orders/` | Customer/admin orders, tracking and cancellation: `actions.ts`, `admin-access.ts`, `admin-emails.ts`, `admin-schema.ts`, `admin-types.ts`, `admin.ts`, `auto-cancel.ts`, `cancel.ts`, `checkout.ts`, `customer.ts`, `emails.ts`, `schema.ts`, `service.ts`, `status.ts`, `types.ts`. |
| `payments/` | Reserved feature folder for payment behavior; currently contains only `.gitkeep`. |
| `payouts/` | Reserved feature folder for payout behavior; currently contains only `.gitkeep`. |
| `products/` | Seller product management: `access.ts`, `actions.ts`, `form-errors.ts`, `schema.ts`, `seller.ts`, `service.ts`, `types.ts`. |
| `reports/` | Reserved feature folder for report behavior; currently contains only `.gitkeep`. |
| `reviews/` | Customer review creation and moderation support: `access.ts`, `actions.ts`, `customer.ts`, `schema.ts`, `service.ts`, `types.ts`. |
| `sellers/` | Seller application, profile and shop management: `access.ts`, `actions.ts`, `emails.ts`, `schema.ts`, `seller.ts`, `service.ts`, `types.ts`. |
| `settings/` | Reserved feature folder for settings behavior; currently contains only `.gitkeep`. |
| `shipments/` | Reserved feature folder for shipment behavior; currently contains only `.gitkeep`. |
| `users/` | Customer profile, password and avatar behavior: `access.ts`, `actions.ts`, `schema.ts`, `service.ts`, `types.ts`. |
| `wishlist/` | Customer wishlist behavior: `access.ts`, `actions.ts`, `schema.ts`, `service.ts`, `types.ts`. |
| `src/modules/README.md` | Explains the feature-module pattern and boundaries. |
| `.gitkeep` files | Preserve currently empty/reserved feature folders in Git. |

### Other `src/` folders

| Path / files | What they do |
| --- | --- |
| `src/middleware.ts` | Next.js middleware for request-level routing/security behavior. |
| `src/hooks/use-cart.ts`, `use-wishlist.ts` | Client hooks for cart and wishlist state. |
| `src/hooks/.gitkeep` | Keeps the hooks directory in Git. |
| `src/styles/tokens.css` | Design-system color, spacing and component tokens. |
| `src/styles/glass.css` | Shared glassmorphism styles. |
| `src/styles/splash.css` | Splash/loading screen styles. |
| `src/styles/.gitkeep`, `src/types/.gitkeep` | Preserve folders for future shared styles/types. |

## 6. Tests (`tests/`)

| Path / files | What they verify |
| --- | --- |
| `e2e/home.spec.ts` | Browser-level home-page behavior. |
| `e2e/storefront.spec.ts` | Browser-level storefront flows. |
| `e2e/.gitkeep` | Keeps the end-to-end test folder present. |
| `fixtures/products.ts` | Reusable test product data. |
| `support/db.ts` | In-memory MongoDB connection helpers for tests. |
| `support/empty-module.ts` | Empty module stub for test isolation. |
| `support/mongo-global-setup.ts` | Starts/configures MongoDB for integration test runs. |
| `support/setup-env.ts` | Test environment setup. |
| `integration/account/addresses.test.ts`, `wishlist-account.test.ts` | Persisted account address and wishlist behavior. |
| `integration/admin/approvals.test.ts`, `config.test.ts`, `people.test.ts` | Admin approvals, configuration and user/seller administration. |
| `integration/auth/register-reset.test.ts`, `set-password.test.ts`, `sign-in.test.ts`, `two-factor.test.ts` | Auth, password and two-factor flows. |
| `integration/catalog/repositories.test.ts`, `seller-products.test.ts` | Catalogue repositories and seller product persistence. |
| `integration/db/mongoose.test.ts`, `photo-sets-migration.test.ts`, `serial-numbers-migration.test.ts`, `shop-fields-migration.test.ts` | Mongo connection and database migrations. |
| `integration/orders/admin-orders.test.ts`, `auto-cancel.test.ts`, `cancel-review.test.ts`, `fulfilment.test.ts`, `place-order.test.ts` | Order creation, admin actions, cancellation, fulfilment and scheduled cancellation. |
| `integration/sellers/shop.test.ts` | Seller shop persistence and behavior. |
| `unit/admin/config-schema.test.ts` | Admin configuration validation. |
| `unit/auth/authorize.test.ts`, `route-access.test.ts`, `schema.test.ts`, `service.test.ts`, `tokens-breached.test.ts` | Auth permissions, routes, input schemas, services and token/password checks. |
| `unit/cart/merge.test.ts`, `pricing.test.ts` | Cart merge and price calculations. |
| `unit/catalog/filter-form.test.ts`, `product-images.test.ts`, `query.test.ts`, `variant-select.test.ts` | Catalogue filters, images, queries and product variants. |
| `unit/config/env.test.ts` | Environment configuration validation. |
| `unit/data-model-doc.test.ts` | Keeps the data-model documentation consistent with database models/migrations. |
| `unit/fulfilment/fulfilment.test.ts` | Fulfilment rules. |
| `unit/layout/nav-active.test.ts` | Active navigation behavior. |
| `unit/misc/geo-tiles.test.ts`, `small-utils.test.ts` | Map tile and miscellaneous helper behavior. |
| `unit/orders/status.test.ts`, `track.test.ts` | Order statuses and tracking lookup. |
| `unit/products/products.test.ts` | Product business behavior. |
| `unit/security/cron-auth.test.ts`, `headers.test.ts` | Cron authorization and security headers. |
| `unit/sellers/documents.test.ts`, `sellers.test.ts` | Seller document and seller behavior. |
| `unit/users/avatar.test.ts`, `schema.test.ts` | Avatar storage paths and user validation. |
| `unit/utils/money.test.ts` | Money conversion/formatting. |

## 7. Upstash Blob and Upstash Redis in this project

These are separate services for different kinds of data:

| Service | Project use | Code entry points |
| --- | --- | --- |
| **Upstash Blob** | Object/file storage for product images, profile/shop images and seller verification documents. Images are validated and re-encoded before upload; seller documents are encrypted before storage and decrypted only for authorized access. Blob object data is not the MongoDB catalogue: MongoDB stores the relevant records/URLs or document paths. | `src/lib/storage/blob.ts`, `src/lib/storage/documents.ts`, `src/lib/images/`, `src/config/storage.ts`; configured by `UPSTASH_BLOB_TOKEN`. |
| **Upstash Redis** | Shared rate-limit state. The rate limiter uses a sliding window so limits apply across multiple serverless instances, rather than each instance having an unrelated counter. | `src/lib/security/rate-limit.ts`; configured by `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. |

In local development and tests, Redis rate limiting can use an in-memory
implementation; production requires the Redis settings. Blob storage requires
`UPSTASH_BLOB_TOKEN` in production. Seller documents use `DOCS_ENCRYPTION_KEY`
in addition to the Blob token. Do not expose these values to browser code or
commit them.

**Implementation detail:** ADR-005 discusses a separate private documents
bucket, but the current `documents.ts` adapter writes encrypted document bytes
through the Blob adapter and does not issue public document URLs. The code
therefore relies on encryption and authorized server-side reads; bucket access
settings should be checked when configuring production storage.

## 8. Local/generated folders

These folders may appear on a developer machine but are generated, deployment
state, or local data rather than project source:

| Folder | Purpose |
| --- | --- |
| `node_modules/` | Installed JavaScript dependencies. |
| `.next/` | Next.js build and development cache/output. |
| `test-results/` | Playwright output from browser tests. |
| `.mongo-dev/` | Local development MongoDB data/runtime files. |
| `.vercel/` | Local Vercel project/link state. |
| `output/` under `scripts/python/` | Generated image-processing output. |
