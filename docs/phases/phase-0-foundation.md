# Phase 0 — Foundation

**Goal:** an empty but production-ready skeleton: strict TypeScript, tooling, env validation, security headers, design tokens, CI and Vercel previews.

## Steps
1. The repo already has `docs/`, `CLAUDE.md` and folders, so create the app in a temporary folder and copy it in:
   ```bash
   pnpm create next-app@latest ../teleshop-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
   rsync -av --ignore-existing ../teleshop-tmp/ ./ --exclude .git --exclude README.md
   rm -rf ../teleshop-tmp && pnpm install
   ```
   (On Windows without rsync: copy the files manually and keep our `README.md`, `.gitignore` and `docs/`.)
2. `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`.
3. Add Prettier, `eslint-plugin-security`, Husky + lint-staged, commitlint (conventional). Scripts: `lint`, `typecheck`, `format`, `test`, `check`.
4. `src/config/env.ts`: Zod schema for server + public vars; import it from `next.config.ts` so builds fail on bad env.
5. `middleware.ts`: generate a nonce per request, set CSP + headers from doc 10 §2.
6. `src/styles/tokens.css` + `glass.css` from doc 05; fonts with `next/font/google` (self-hosted at build).
7. Base UI components + `/dev/ui` page (excluded in production via `notFound()`).
8. `.github/workflows/ci.yml` (already in the repo) — make it pass; connect Vercel.

## Claude Code prompt
> Read CLAUDE.md, docs/03-tech-stack.md, docs/05-design-system.md and docs/10-security.md §2. Implement P0-T01 to P0-T03 only. Plan first and list the files you will create. After approval, implement, run `pnpm check`, and show me the diff summary.
