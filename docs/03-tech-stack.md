# Tech stack

**DOC-03** · Pin exact versions in `package.json`. Upgrade one library per PR and note it here.

| Area | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router, React 19, Server Components, Server Actions) | One app for store, seller and admin; ISR + streaming; first-class on Vercel |
| Language | **TypeScript** `strict: true`, `noUncheckedIndexedAccess: true` | Catch bugs at compile time |
| Package manager | **pnpm** | Fast, strict dependency tree |
| Styling | **Tailwind CSS v4** + CSS variables (`src/styles/tokens.css`) | Small CSS, tokens shared with Figma variables |
| Animated UI | **React Bits** (reactbits.dev) — copied components, wrapped in `components/ui` | Text, background and card effects without a heavy library |
| 3D UI | **ThreeUI Community** (`@designcodeio/threeui`, MIT) for 3D effects/backgrounds; **React Three Fiber + drei** for our own GLB hero | ThreeUI for ready-made three.js effects; R3F for full control of product models |
| 3D assets | **gltf-transform** CLI (Draco/meshopt + WebP/KTX2 textures) | GLB files small enough for phones |
| Database | **MongoDB Atlas** (replica set) + **Mongoose 8** | Flexible per-category specs and embedded variants; transactions |
| Validation | **Zod** (shared client + server) + **React Hook Form** | One schema for form and server |
| Auth | **Auth.js v5** (Credentials + Google), JWT sessions; **@node-rs/argon2**; **otplib** (admin TOTP) | Standard, maintained, secure defaults |
| Images | **Upstash Blob** (`@upstash/blob`) + `next/image` + **sharp** (re-encode uploads) | Free tier, Cloudflare CDN, private bucket for seller documents ([ADR-005](adr/ADR-005-upstash-blob.md)) |
| Rate limit | **@upstash/ratelimit** + Upstash Redis (in-memory fallback in dev) | Works across serverless functions |
| Email | **Nodemailer** (SMTP) + React Email templates | Verification, reset, order emails |
| Charts | **Recharts** (admin/seller dashboards, loaded only there) | Simple, small enough when code-split |
| Testing | **Vitest**, **mongodb-memory-server** (replica set), **Playwright**, **@axe-core/playwright** | Fast unit + real Mongo integration + E2E + a11y |
| Quality | ESLint (next + security plugin), Prettier, Husky + lint-staged, commitlint | Consistent code, no bad commits |
| CI | **GitHub Actions** → Vercel preview per PR | Checks before merge |
| Monitoring | Vercel Analytics + Speed Insights, Sentry (errors) | Performance and error visibility |
| Scripts | **Python 3.11** (`requests`, `Pillow`) | Product image fetch + optimise ([doc 07](07-product-images.md)) |

## Libraries we deliberately do not use
- **No full CMS** (Payload, Strapi): the admin is custom and lighter.
- **No GraphQL**: Server Actions + a small REST API are enough.
- **No client state library** at first: URL state + React state + server data. Add Zustand only for the cart drawer if needed.
- **No UI kit with its own theme** (MUI, Chakra): conflicts with our tokens.
