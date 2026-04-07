"use client";

import { create } from "zustand";

import type { ConnectionRequest, TypingState, User } from "@/lib/types";

type UserState = {
  currentUser: User | null;
  users: User[];
  typingByPeerId: Record<string, TypingState>;
  pendingRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  setCurrentUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  upsertUser: (user: User) => void;
  setTypingState: (typingState: TypingState) => void;
  upsertPendingRequest: (request: ConnectionRequest) => void;
  upsertSentRequest: (request: ConnectionRequest) => void;
  resolveRequest: (requestId: string) => void;
};

function sortUsers(users: User[]) {
  return [...users].sort((left, right) => {
    if (left.isOnline !== right.isOnline) {
      return left.isOnline ? -1 : 1;
    }

    return right.lastActiveAt - left.lastActiveAt;
  });
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  users: [],
  typingByPeerId: {},
  pendingRequests: [],
  sentRequests: [],
  setCurrentUser: (user) => set({ currentUser: user }),
  setUsers: (users) => set({ users: sortUsers(users) }),
  upsertUser: (user) =>
    set((state) => {
      const users = state.users.filter((entry) => entry.peerId !== user.peerId);
      users.push(user);

      return {
        users: sortUsers(users),
        currentUser: state.currentUser?.peerId === user.peerId ? user : state.currentUser,
      };
    }),
  setTypingState: (typingState) =>
    set((state) => ({
      typingByPeerId: {
        ...state.typingByPeerId,
        [typingState.peerId]: typingState,
      },
    })),
  upsertPendingRequest: (request) =>
    set((state) => ({
      pendingRequests: [request, ...state.pendingRequests.filter((item) => item.id !== request.id)],
    })),
  upsertSentRequest: (request) =>
    set((state) => ({
      sentRequests: [request, ...state.sentRequests.filter((item) => item.id !== request.id)],
    })),
  resolveRequest: (requestId) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((item) => item.id !== requestId),
      sentRequests: state.sentRequests.filter((item) => item.id !== requestId),
    })),
}));
