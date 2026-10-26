export type { UserDTO } from "@/db/repositories/user.repository";

export type ChangePasswordResult =
  { ok: true } | { ok: false; field: "currentPassword" | "password"; message: string };
