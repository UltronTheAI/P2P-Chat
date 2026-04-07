"use client";

import { useCallback, useEffect, useState } from "react";

import { getUser, initDB, saveUser } from "@/lib/db";
import { createUser } from "@/lib/peer";
import type { User } from "@/lib/types";
import { getPeerId, sanitizeNameInput } from "@/lib/utils";
import { useUserStore } from "@/store/useUserStore";

export function usePeer() {
  const [peerId, setPeerId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const upsertUser = useUserStore((state) => state.upsertUser);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await initDB();
      const nextPeerId = getPeerId();
      const existingUser = await getUser(nextPeerId);
      const nextUser: User = existingUser
        ? {
            ...existingUser,
            isOnline: true,
            updatedAt: Date.now(),
          }
        : createUser(nextPeerId, true);

      await saveUser(nextUser);

      if (!isMounted) {
        return;
      }

      setPeerId(nextPeerId);
      setCurrentUser(nextUser);
      upsertUser(nextUser);
      setIsReady(true);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [setCurrentUser, upsertUser]);

  const updateName = useCallback(
    async (name: string) => {
      const currentUser = useUserStore.getState().currentUser;

      if (!currentUser) {
        return null;
      }

      const nextUser = {
        ...currentUser,
        name: sanitizeNameInput(name),
        updatedAt: Date.now(),
      };

      await saveUser(nextUser);
      setCurrentUser(nextUser);
      upsertUser(nextUser);
      return nextUser;
    },
    [setCurrentUser, upsertUser],
  );

  return {
    peerId,
    isReady,
    updateName,
  };
}
