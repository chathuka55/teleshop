# Building Teleshop with Claude Code

**DOC-14** · How to turn each task in [doc 13](13-phases.md) into working, reviewed code.

## 1. One-time setup
1. Install Claude Code and open the repo folder: `cd teleshop && claude`.
2. Start every session with “Read RULES.md” (it is not loaded automatically). Keep it accurate — it is the most important file for good results.
3. Custom commands are in `.claude/commands/` (type `/` in Claude Code to see them):
   - `/task P1-T03` — plan and implement one task
   - `/db-change` — guided model/index/migration change that also updates doc 08
   - `/review` — security + quality review of the current diff
4. Optional: connect the Figma MCP so Claude can read frames (e.g. "match Figma frame 03 · Product Details").

## 2. The loop for every task

```text
pick task ─► /task Px-Tyy ─► Claude plans ─► you approve/adjust ─► Claude codes + tests
     ▲                                                                   │
     └── tick task in doc 13 ◄── commit [Px-Tyy] ◄── /review ◄── pnpm check
```

1. **Plan first.** Ask for a plan before code. Check it lists files, tests and docs to update.
2. **Small scope.** One task per session (or per branch). Clear context (`/clear`) between tasks.
3. **Tests with code.** Ask for the failing test first on logic tasks (checkout, inventory, tracking).
4. **Run checks.** Claude must run `pnpm check` (and `pnpm test:int` for DB work) and show results.
5. **Review the diff yourself**, then run `/review`.
6. **Commit** `feat(scope): … [Px-Tyy]`, push, open a PR, let CI + the Vercel preview run.

## 3. Good prompts (copy and adapt)

**Starting a phase**
> Read RULES.md and docs/phases/phase-4-checkout.md. Summarise the phase in 5 bullets and list the tasks in order with any blockers. Do not write code yet.

**Implementing a task**
> Implement P4-T04 from docs/13-phases.md. Follow docs/02-architecture.md §3 exactly. Plan first. Write integration tests first (happy path, out of stock, idempotent replay, race on last unit). Then implement. Run `pnpm check && pnpm test:int`.

**UI from Figma**
> Build the Product Details page (Figma "03 · Product Details") using our tokens in src/styles/tokens.css and components in src/components/ui. Server Component by default; only the variant picker and gallery are client components. Show me a screenshot description of each section when done.

**Database change**
> /db-change Add `requiresSerial: boolean` to categories (default false). Update the model, add migration 0004 to set it true for phones and laptops, update docs/08-data-model.md §3.3 and §7, and run the doc-sync test.

**Debugging**
> The checkout fails with OUT_OF_STOCK even when stock exists. Reproduce it with a failing integration test first, find the root cause, fix it, and explain the cause in 3 sentences.

## 4. Rules to repeat to Claude when needed
- "Never trust prices from the client — recalculate on the server."
- "Check role and ownership in the service, and add a test that another user is refused."
- "Update docs/08-data-model.md in the same change."
- "Do not add new dependencies without asking."

## 5. Branch and PR flow
- `main` = production, `develop` = staging (optional), feature branches `feat/P4-T04-place-order`.
- PR template: what/why, task ID, screenshots, migration notes, security checklist from doc 10 §3.
