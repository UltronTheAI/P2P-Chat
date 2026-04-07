"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Copy,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  Search,
  SendHorizontal,
  UserRoundPlus,
  X,
} from "lucide-react";

import type { Chat, ConnectionRequest, User } from "@/lib/types";
import { getDisplayName } from "@/lib/utils";
import { UserItem } from "@/components/UserItem";

type UserListProps = {
  chats: Chat[];
  currentPeerId: string;
  currentUserName: string;
  isDesktopCollapsed: boolean;
  isMobileListOpen: boolean;
  pendingRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  selectedChatId: string | null;
  users: User[];
  onApproveRequest: (requestId: string, peerId: string) => Promise<void>;
  onCloseMobileList: () => void;
  onCopyPeerId: () => Promise<boolean>;
  onRejectRequest: (requestId: string, peerId: string) => void;
  onRequestChat: (peerId: string) => Promise<void>;
  onSelectChat: (peerId: string) => Promise<void>;
  onToggleDesktopCollapse: () => void;
};

export function UserList({
  chats,
  currentPeerId,
  currentUserName,
  isDesktopCollapsed,
  isMobileListOpen,
  pendingRequests,
  sentRequests,
  selectedChatId,
  users,
  onApproveRequest,
  onCloseMobileList,
  onCopyPeerId,
  onRejectRequest,
  onRequestChat,
  onSelectChat,
  onToggleDesktopCollapse,
}: UserListProps) {
  const [search, setSearch] = useState("");
  const [newPeerId, setNewPeerId] = useState("");
  const [copied, setCopied] = useState(false);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return chats;
    }

    return chats.filter((chat) => {
      const user = users.find((entry) => entry.peerId === chat.peerId);
      const label = `${chat.peerId} ${user?.name ?? ""} ${chat.lastMessage}`.toLowerCase();
      return label.includes(query);
    });
  }, [chats, search, users]);

  const availableUsers = useMemo(() => {
    const existingChats = new Set(chats.map((chat) => chat.peerId));
    return users.filter(
      (user) => user.isOnline && user.peerId !== currentPeerId && !existingChats.has(user.peerId),
    );
  }, [chats, currentPeerId, users]);

  return (
    <aside
      className={[
        "z-20 h-full overflow-hidden border-r border-[#1f1f1f] bg-[linear-gradient(180deg,#050505_0%,#000000_100%)] transition-[width] duration-200",
        isMobileListOpen ? "fixed inset-0 flex w-full flex-col" : "hidden lg:flex lg:flex-col",
        isDesktopCollapsed ? "lg:w-[88px] lg:min-w-[88px]" : "lg:w-[390px] lg:min-w-[390px]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-4 md:px-5">
        <div className={isDesktopCollapsed ? "hidden lg:hidden" : "block"}>
          <div className="text-xs uppercase tracking-[0.32em] text-[#6b7280]">P2P Chat</div>
          <div className="mt-1 text-lg font-semibold text-white">Hi, {currentUserName}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] text-[#9ca3af]"
            aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isDesktopCollapsed ? <ChevronLeft className="h-4 w-4 rotate-180" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onCloseMobileList}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] text-[#9ca3af] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isDesktopCollapsed ? (
        <div className="hidden h-full flex-1 flex-col items-center gap-4 px-3 py-4 lg:flex">
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22c55e] text-black"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
          <div className="h-px w-full bg-[#1f1f1f]" />
          <div className="flex flex-col gap-3 text-[#9ca3af]">
            <Menu className="h-5 w-5" />
            <Search className="h-5 w-5" />
            <MessageSquarePlus className="h-5 w-5" />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 border-b border-[#1f1f1f] px-4 py-4 md:px-5">
            <div className="rounded-[28px] border border-[#1f1f1f] bg-[#0f0f0f] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-[#6b7280]">Your Peer ID</div>
                  <div className="mt-2 break-all text-sm font-medium text-white">{currentPeerId}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const didCopy = await onCopyPeerId();
                    setCopied(didCopy);
                    if (didCopy) {
                      window.setTimeout(() => setCopied(false), 1500);
                    }
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22c55e] text-black"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[24px] border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3">
              <Search className="h-4 w-4 text-[#6b7280]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b7280]"
              />
            </label>

            <div className="rounded-[28px] border border-[#1f1f1f] bg-[#0f0f0f] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#6b7280]">
                <UserRoundPlus className="h-4 w-4" />
                Request connection
              </div>
              <div className="flex gap-2">
                <input
                  value={newPeerId}
                  onChange={(event) => setNewPeerId(event.target.value)}
                  placeholder="Paste Peer ID"
                  className="min-w-0 flex-1 rounded-2xl border border-[#1f1f1f] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-[#6b7280]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newPeerId.trim();
                    if (!trimmed || trimmed === currentPeerId) {
                      return;
                    }
                    void onRequestChat(trimmed);
                    setNewPeerId("");
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e] text-black"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="border-b border-[#1f1f1f] px-4 py-4 md:px-5">
              <div className="mb-3 text-xs uppercase tracking-[0.28em] text-[#6b7280]">Requests</div>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-[24px] border border-[#1f1f1f] bg-[#0f0f0f] p-4">
                    <div className="text-sm font-semibold text-white">{request.fromName}</div>
                    <div className="mt-1 text-xs text-[#9ca3af]">wants to start a secure chat</div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void onApproveRequest(request.id, request.fromPeerId);
                        }}
                        className="rounded-2xl bg-[#22c55e] px-4 py-2 text-sm font-medium text-black"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectRequest(request.id, request.fromPeerId)}
                        className="rounded-2xl border border-[#1f1f1f] px-4 py-2 text-sm font-medium text-[#9ca3af]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-b border-[#1f1f1f] px-4 py-4 md:px-5">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#6b7280]">
              <span>Available users</span>
              <span>{availableUsers.length}</span>
            </div>
            <div className="space-y-2">
              {availableUsers.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#1f1f1f] px-4 py-3 text-sm text-[#6b7280]">
                  No named online users available yet.
                </div>
              ) : (
                availableUsers.map((user) => (
                  <button
                    type="button"
                    key={user.peerId}
                    onClick={() => {
                      void onRequestChat(user.peerId);
                    }}
                    className="flex w-full items-center justify-between rounded-[22px] border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-left transition hover:border-[#22c55e]/30"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{getDisplayName(user.name, user.peerId)}</div>
                      <div className="text-xs text-[#9ca3af]">Online and available</div>
                    </div>
                    <MessageSquarePlus className="h-4 w-4 text-[#22c55e]" />
                  </button>
                ))
              )}
            </div>
          </div>

          {sentRequests.length > 0 ? (
            <div className="border-b border-[#1f1f1f] px-4 py-4 md:px-5">
              <div className="mb-3 text-xs uppercase tracking-[0.28em] text-[#6b7280]">Waiting for approval</div>
              <div className="space-y-2">
                {sentRequests.map((request) => (
                  <div key={request.id} className="rounded-[20px] border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-sm text-[#9ca3af]">
                    {request.toPeerId.slice(0, 8)}... pending
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="px-4 py-4 md:px-5">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#6b7280]">
              <span>Conversations</span>
              <button
                type="button"
                onClick={onCloseMobileList}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] px-3 py-2 text-[#9ca3af] lg:hidden"
              >
                <Menu className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className="space-y-3">
              {filteredChats.map((chat) => (
                <UserItem
                  key={chat.chatId}
                  chat={chat}
                  user={users.find((entry) => entry.peerId === chat.peerId) ?? null}
                  isActive={chat.chatId === selectedChatId}
                  onClick={() => {
                    void onSelectChat(chat.peerId);
                    onCloseMobileList();
                  }}
                />
              ))}
              {filteredChats.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-[#1f1f1f] p-6 text-sm text-[#6b7280]">
                  No conversations yet. Start by sending a connection request.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
