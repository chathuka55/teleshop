# Teleshop documentation

Start here. Read in this order the first time; after that, jump to what you need.

| # | Document | Read when |
| --- | --- | --- |
| 01 | [Project overview](01-project-overview.md) | You are new to the project |
| 02 | [Architecture](02-architecture.md) | Before writing any code |
| 03 | [Tech stack](03-tech-stack.md) | Adding or upgrading a library |
| 04 | [Project structure](04-project-structure.md) | Deciding where a file goes |
| 05 | [Design system](05-design-system.md) | Building any UI |
| 06 | [3D hero](06-3d-hero.md) | Working on the home page hero or `.glb` files |
| 07 | [Product images](07-product-images.md) | Adding product photos |
| 08 | [Data model](08-data-model.md) | Any database change (keep it in step with the code) |
| 09 | [API](09-api.md) | Adding a Server Action or endpoint |
| 10 | [Security](10-security.md) | Any auth, input, upload or write path |
| 11 | [Testing](11-testing.md) | Writing tests |
| 12 | [Deployment](12-deployment.md) | Setting up Atlas/Vercel or releasing |
| 13 | [Phases](13-phases.md) | Picking the next task |
| 14 | [Claude Code workflow](14-claude-code-workflow.md) | Building a task with Claude Code |

**Decision records:** [adr/](adr/) — one file per important choice. Add a new ADR instead of editing an accepted one.

**Doc rules**
- Docs live next to the code and change in the same PR as the code.
- `08-data-model.md` is checked by a unit test: every collection and migration must be listed.
- Write simple, direct English. Prefer tables and examples over long paragraphs.
