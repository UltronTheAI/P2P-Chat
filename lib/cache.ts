import { LRUCache } from "lru-cache";

import type { User } from "@/lib/types";

export const activeUsersCache = new LRUCache<string, User>({
  max: 500,
  ttl: 1000 * 60 * 30,
});

export function setActiveUser(user: User) {
  activeUsersCache.set(user.peerId, user);
}

export function removeActiveUser(peerId: string) {
  activeUsersCache.delete(peerId);
}

export function getActiveUsers() {
  return Array.from(activeUsersCache.values());
}
