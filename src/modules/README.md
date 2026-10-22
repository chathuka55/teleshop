# Feature modules

Each folder is one feature. Every module has the same files:

| File         | Contains                                                        |
| ------------ | --------------------------------------------------------------- |
| `schema.ts`  | Zod schemas for inputs (shared by forms and server)             |
| `access.ts`  | Pure functions: `canX(user, resource)` — unit tested            |
| `service.ts` | Business rules; calls repositories; transactions; audit logs    |
| `actions.ts` | `"use server"` Server Actions: parse → guard → service → result |
| `types.ts`   | DTO and result types                                            |

Pages call actions or services. Services call repositories. Nothing else touches Mongoose models.
