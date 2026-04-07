"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, PanelLeftOpen, PencilLine } from "lucide-react";

import { ChatWindow } from "@/components/ChatWindow";
import { MessageInput } from "@/components/MessageInput";
import { UserList } from "@/components/UserList";
import { useMessages } from "@/hooks/useMessages";
import { usePeer } from "@/hooks/usePeer";
import { usePresence } from "@/hooks/usePresence";
import { getDisplayName, sanitizeNameInput } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";

export function ChatApp() {
  const { peerId, isReady, updateName } = usePeer();
  const { broadcastProfile } = usePresence(peerId, isReady);
  const {
    chats,
    selectedChatId,
    replyTarget,
    openChat,
    requestConnection,
    approveConnection,
    rejectConnection,
    sendMessage,
    removeMessage,
    removeConversation,
    queueTyping,
    markChatAsRead,
    setReplyTarget,
  } = useMessages(peerId, isReady);

  const users = useUserStore((state) => state.users);
  const typingByPeerId = useUserStore((state) => state.typingByPeerId);
  const pendingRequests = useUserStore((state) => state.pendingRequests);
  const sentRequests = useUserStore((state) => state.sentRequests);
  const currentUser = useUserStore((state) => state.currentUser);
  const selectChat = useChatStore((state) => state.selectChat);

  const [isSending, setIsSending] = useState(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.chatId === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.peerId === selectedChat?.peerId) ?? null,
    [selectedChat?.peerId, users],
  );

  const isTyping = selectedChat ? Boolean(typingByPeerId[selectedChat.peerId]?.isTyping) : false;
  const currentUserName = getDisplayName(currentUser?.name, peerId || "local");
  const replyLabel = replyTarget
    ? getDisplayName(
        users.find((user) => user.peerId === replyTarget.senderPeerId)?.name ??
          (replyTarget.senderPeerId === peerId ? currentUser?.name : null),
        replyTarget.senderPeerId,
      )
    : null;

  useEffect(() => {
    if (currentUser?.name) {
      setNameInput(currentUser.name);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      selectChat(chats[0].chatId);
    }
  }, [chats, selectChat, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    void markChatAsRead(selectedChatId);
  }, [markChatAsRead, selectedChatId, selectedChat?.messages.length]);

  useEffect(() => {
    if (selectedChatId) {
      setIsMobileListOpen(false);
    }
  }, [selectedChatId]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-[#9ca3af]">
        Preparing your peer identity...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      {!currentUser?.name ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[36px] border border-[#1f1f1f] bg-[#0c0c0c] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-green-500/10 text-[#22c55e]">
              <PencilLine className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Choose your display name</h1>
            <p className="mt-3 text-sm leading-7 text-[#9ca3af]">
              Other users will see this in available users, requests, and conversations.
            </p>
            <input
              value={nameInput}
              onChange={(event) => setNameInput(sanitizeNameInput(event.target.value))}
              placeholder="Enter your name"
              className="mt-6 w-full rounded-[24px] border border-[#1f1f1f] bg-black px-5 py-4 text-white outline-none placeholder:text-[#6b7280]"
            />
            <button
              type="button"
              onClick={async () => {
                const nextName = sanitizeNameInput(nameInput);
                if (!nextName) {
                  return;
                }
                const nextUser = await updateName(nextName);
                if (nextUser) {
                  broadcastProfile(nextUser.name);
                }
              }}
              className="mt-5 inline-flex w-full items-center justify-center rounded-[24px] bg-[#22c55e] px-5 py-4 text-sm font-semibold text-black"
            >
              Continue to chat
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex h-screen w-full max-w-[1800px] overflow-hidden bg-black lg:flex-row">
        <UserList
          chats={chats}
          users={users}
          currentPeerId={peerId}
          currentUserName={currentUserName}
          isDesktopCollapsed={isDesktopSidebarCollapsed}
          isMobileListOpen={isMobileListOpen}
          pendingRequests={pendingRequests}
          sentRequests={sentRequests}
          selectedChatId={selectedChatId}
          onApproveRequest={approveConnection}
          onCloseMobileList={() => setIsMobileListOpen(false)}
          onCopyPeerId={async () => {
            try {
              await navigator.clipboard.writeText(peerId);
              return true;
            } catch {
              return false;
            }
          }}
          onRejectRequest={rejectConnection}
          onRequestChat={requestConnection}
          onSelectChat={openChat}
          onToggleDesktopCollapse={() => setIsDesktopSidebarCollapsed((value) => !value)}
        />

        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileListOpen(true)}
              className="rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-2 text-sm text-[#9ca3af]"
            >
              Chats
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquare className="h-4 w-4 text-[#22c55e]" />
              {selectedUser ? getDisplayName(selectedUser.name, selectedUser.peerId) : "P2P Chat"}
            </div>
          </div>

          {isDesktopSidebarCollapsed ? (
            <div className="hidden shrink-0 border-b border-[#1f1f1f] px-4 py-3 lg:flex">
              <button
                type="button"
                onClick={() => setIsDesktopSidebarCollapsed(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-2 text-sm text-[#9ca3af] transition hover:text-white"
              >
                <PanelLeftOpen className="h-4 w-4" />
                Open sidebar
              </button>
            </div>
          ) : null}

          <ChatWindow
            chat={selectedChat}
            currentPeerId={peerId}
            isMobileListOpen={isMobileListOpen}
            onBackToList={() => setIsMobileListOpen(true)}
            onDeleteConversation={(chatId) => {
              void removeConversation(chatId);
            }}
            onDeleteMessage={(message) => {
              void removeMessage(message);
            }}
            onReplyMessage={(message) => setReplyTarget(message)}
            user={selectedUser}
            typing={isTyping}
          />

          <div className="shrink-0 border-t border-[#1f1f1f] bg-black/95">
            <MessageInput
              disabled={!selectedChat || !selectedChat.isApproved || isSending}
              replyTarget={replyTarget}
              replyLabel={replyLabel}
              onCancelReply={() => setReplyTarget(null)}
              onTyping={(content) => {
                if (!selectedChat) {
                  return;
                }

                queueTyping(selectedChat.peerId, content);
              }}
              onSend={async (content) => {
                if (!selectedChat) {
                  return;
                }

                setIsSending(true);
                try {
                  await sendMessage(selectedChat.peerId, content);
                } finally {
                  setIsSending(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
