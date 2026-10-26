import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import { UserModel, WishlistModel } from "@/db/models";
import {
  changePasswordAndRevokeSessions,
  findAuthState,
  updateUserProfile,
} from "@/db/repositories/user.repository";
import {
  WISHLIST_MAX,
  addToWishlist,
  getWishlistIds,
  mergeIntoWishlist,
  removeFromWishlist,
} from "@/db/repositories/wishlist.repository";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_account");

const id = (): string => new Types.ObjectId().toString();
let userId = "";

beforeAll(async () => {
  await Promise.all([UserModel.deleteMany({}), WishlistModel.deleteMany({})]);
  const u = await UserModel.create({ email: "acct@test.lk", name: "Acct User", passwordHash: "$argon2id$x" });
  userId = u._id.toString();
});

describe("wishlist repository (P4-T02)", () => {
  it("keeps newest first and never duplicates", async () => {
    const [a, b] = [id(), id()];
    await addToWishlist(userId, a);
    await addToWishlist(userId, b);
    await addToWishlist(userId, a); // re-saving moves it to the front
    expect(await getWishlistIds(userId)).toEqual([a, b]);
    await removeFromWishlist(userId, a);
    expect(await getWishlistIds(userId)).toEqual([b]);
  });

  it("merges guest hearts without duplicates and caps the list", async () => {
    const before = await getWishlistIds(userId);
    const guest = [before[0] ?? id(), id(), id()];
    await mergeIntoWishlist(userId, guest);
    const after = await getWishlistIds(userId);
    expect(new Set(after).size).toBe(after.length);
    expect(after).toEqual(expect.arrayContaining(guest));

    await mergeIntoWishlist(userId, Array.from({ length: WISHLIST_MAX + 20 }, id));
    expect((await getWishlistIds(userId)).length).toBe(WISHLIST_MAX);
  });
});

describe("account repository (P2-T06)", () => {
  it("updates name and phone", async () => {
    await updateUserProfile(userId, { name: "New Name", phone: "+94771234567" });
    expect(await findAuthState(userId)).toMatchObject({ name: "New Name" });
    expect((await UserModel.findById(userId).lean())?.phone).toBe("+94771234567");
  });

  it("changing the password stores a real hash and revokes sessions", async () => {
    const before = (await findAuthState(userId))?.tokenVersion ?? 0;
    await changePasswordAndRevokeSessions(userId, "$argon2id$v=19$new");
    const u = await UserModel.findById(userId).select("+passwordHash").lean();
    expect(u?.passwordHash).toBe("$argon2id$v=19$new");
    expect((await findAuthState(userId))?.tokenVersion).toBe(before + 1);
  });
});
