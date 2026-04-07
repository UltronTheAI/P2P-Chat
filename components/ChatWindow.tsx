"use client";

import { ArrowLeft, MessageSquarePlus, ShieldCheck, Trash2 } from "lucide-react";

import { MessageBubble } from "@/components/MessageBubble";
import type { Chat, Message, User } from "@/lib/types";
import { formatLastActive, getDisplayName } from "@/lib/utils";

type ChatWindowProps = {
  chat: Chat | null;
  currentPeerId: string;
  isMobileListOpen: boolean;
  onBackToList: () => void;
  onDeleteConversation: (chatId: string) => void;
  onDeleteMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  typing: boolean;
  user: User | null;
};

export function ChatWindow({
  chat,
  currentPeerId,
  isMobileListOpen,
  onBackToList,
  onDeleteConversation,
  onDeleteMessage,
  onReplyMessage,
  typing,
  user,
}: ChatWindowProps) {
  if (!chat) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,#050505_0%,#000000_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-[#1f1f1f] bg-[#0f0f0f]/90 p-8 text-center shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-green-500/10 text-[#22c55e]">
            <MessageSquarePlus className="h-8 w-8" />
          </div>
          <div className="text-xl font-semibold text-white">Pick a conversation</div>
          <p className="mt-3 text-sm leading-7 text-[#9ca3af]">
            Send a connection request, approve incoming requests, then start chatting in real time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,#050505_0%,#000000_100%)]",
        isMobileListOpen ? "hidden lg:flex" : "flex",
      ].join(" ")}
    >
      <header className="shrink-0 border-b border-[#1f1f1f] bg-black/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] text-[#9ca3af] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white md:text-base">
                <span>{getDisplayName(user?.name, chat.peerId)}</span>
                {chat.isApproved ? <ShieldCheck className="h-4 w-4 text-[#22c55e]" /> : null}
              </div>
              <div className="mt-1 text-xs text-[#9ca3af]">
                {typing
                  ? "typing..."
                  : user?.isOnline
                    ? "Online now"
                    : `Last active ${formatLastActive(user?.lastActiveAt ?? 0)}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDeleteConversation(chat.chatId)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] px-3 py-2 text-xs font-medium text-[#9ca3af] transition hover:border-red-500/30 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete Chat</span>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-3">
          {chat.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderPeerId === currentPeerId}
              onDelete={onDeleteMessage}
              onReply={onReplyMessage}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
