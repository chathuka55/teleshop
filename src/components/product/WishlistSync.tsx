"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { readLocalWishlist, useWishlist } from "@/hooks/use-wishlist";
import { syncWishlistAction } from "@/modules/wishlist/actions";

/**
 * On /account/wishlist: sends hearts saved as a guest to the account once, then makes the browser
 * copy match the server list, so hearts show the same state on every page and device.
 */
export function WishlistSync({ serverIds }: { serverIds: string[] }) {
  const router = useRouter();
  const { replaceAll } = useWishlist();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const local = readLocalWishlist();
    if (local.every((id) => serverIds.includes(id))) {
      replaceAll(serverIds);
      return;
    }
    void syncWishlistAction(local).then((ids) => {
      replaceAll(ids);
      router.refresh();
    });
  }, [serverIds, replaceAll, router]);

  return null;
}
