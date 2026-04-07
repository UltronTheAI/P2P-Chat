"use client";

import { useCallback, useEffect, useMemo } from "react";

import { removeActiveUser, setActiveUser } from "@/lib/cache";
import { getChats, getUsers, saveUser } from "@/lib/db";
import { createUser } from "@/lib/peer";
import { getSocket } from "@/lib/socket";
import type { ActivePeerPayload, ConnectionRequestPayload, ConnectionResponsePayload, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";

export function usePresence(peerId: string, enabled: boolean) {
  const socket = useMemo(() => getSocket(), []);
  const currentUser = useUserStore((state) => state.currentUser);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const setUsers = useUserStore((state) => state.setUsers);
  const upsertUser = useUserStore((state) => state.upsertUser);
  const setChats = useChatStore((state) => state.setChats);
  const upsertPendingRequest = useUserStore((state) => state.upsertPendingRequest);
  const upsertSentRequest = useUserStore((state) => state.upsertSentRequest);
  const resolveRequest = useUserStore((state) => state.resolveRequest);

  const persistUser = useCallback(
    async (user: User) => {
      await saveUser(user);
      upsertUser(user);

      if (user.isOnline) {
        setActiveUser(user);
      } else {
        removeActiveUser(user.peerId);
      }

      if (user.peerId === peerId) {
        setCurrentUser(user);
      }
    },
    [peerId, setCurrentUser, upsertUser],
  );

  const hydrateLocalState = useCallback(async () => {
    const [users, chats] = await Promise.all([getUsers(), getChats()]);
    setUsers(users);
    setChats(chats);
  }, [setChats, setUsers]);

  const applyPresence = useCallback(
    async (payload: ActivePeerPayload, isOnline: boolean) => {
      const now = Date.now();
      const existing = useUserStore.getState().users.find((user) => user.peerId === payload.peerId);
      await persistUser({
        ...(existing ?? createUser(payload.peerId, isOnline, payload.name)),
        name: payload.name ?? existing?.name ?? null,
        isOnline,
        lastActiveAt: payload.lastActiveAt,
        updatedAt: now,
      });
    },
    [persistUser],
  );

  const applyActivePeers = useCallback(
    async (activePeers: ActivePeerPayload[]) => {
      const existingUsers = useUserStore.getState().users;
      const onlineIds = new Set(activePeers.map((entry) => entry.peerId));
      const mergedUsers = new Map(existingUsers.map((user) => [user.peerId, user]));

      for (const activePeer of activePeers) {
        const nextUser = {
          ...(mergedUsers.get(activePeer.peerId) ?? createUser(activePeer.peerId, true, activePeer.name)),
          name: activePeer.name ?? mergedUsers.get(activePeer.peerId)?.name ?? null,
          isOnline: true,
          lastActiveAt: activePeer.lastActiveAt,
          updatedAt: Date.now(),
        };

        mergedUsers.set(activePeer.peerId, nextUser);
        await persistUser(nextUser);
      }

      for (const [knownPeerId, user] of mergedUsers.entries()) {
        if (!onlineIds.has(knownPeerId) && knownPeerId !== peerId) {
          const offlineUser = {
            ...user,
            isOnline: false,
            updatedAt: Date.now(),
          };

          mergedUsers.set(knownPeerId, offlineUser);
          await persistUser(offlineUser);
        }
      }

      setUsers(Array.from(mergedUsers.values()));
    },
    [peerId, persistUser, setUsers],
  );

  useEffect(() => {
    if (!enabled || !peerId) {
      return;
    }

    void hydrateLocalState();

    const onConnect = async () => {
      const user = useUserStore.getState().currentUser ?? currentUser ?? createUser(peerId, true);
      const connectedUser = {
        ...user,
        peerId,
        isOnline: true,
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };

      socket.emit("register-peer", { peerId, name: connectedUser.name });
      await persistUser(connectedUser);
    };

    const onActivePeers = (payload: ActivePeerPayload[]) => {
      void applyActivePeers(payload);
    };

    const onProfileUpdate = (payload: ActivePeerPayload) => {
      void applyPresence(payload, true);
    };

    const onUserOnline = (payload: ActivePeerPayload) => {
      void applyPresence(payload, true);
    };

    const onUserOffline = (payload: ActivePeerPayload) => {
      void applyPresence(payload, false);
    };

    const onConnectionRequest = (payload: ConnectionRequestPayload) => {
      upsertPendingRequest(payload);
    };

    const onConnectionResponse = (payload: ConnectionResponsePayload) => {
      resolveRequest(payload.requestId);
    };

    socket.on("connect", onConnect);
    socket.on("active-peers", onActivePeers);
    socket.on("profile-update", onProfileUpdate);
    socket.on("user-online", onUserOnline);
    socket.on("user-offline", onUserOffline);
    socket.on("connection-request", onConnectionRequest);
    socket.on("connection-response", onConnectionResponse);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("active-peers", onActivePeers);
      socket.off("profile-update", onProfileUpdate);
      socket.off("user-online", onUserOnline);
      socket.off("user-offline", onUserOffline);
      socket.off("connection-request", onConnectionRequest);
      socket.off("connection-response", onConnectionResponse);
    };
  }, [
    applyActivePeers,
    applyPresence,
    currentUser,
    enabled,
    hydrateLocalState,
    peerId,
    persistUser,
    resolveRequest,
    socket,
    upsertPendingRequest,
    upsertSentRequest,
  ]);

  const broadcastProfile = useCallback((name: string | null) => {
    socket.emit("profile-update", { peerId, name });
  }, [peerId, socket]);

  return {
    broadcastProfile,
  };
}
