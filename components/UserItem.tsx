"use client";

import { memo } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";

import type { Chat, User } from "@/lib/types";
import { cn, formatLastActive, getDisplayName } from "@/lib/utils";

type UserItemProps = {
  chat: Chat;
  isActive: boolean;
  user: User | null;
  onClick: () => void;
};

function UserItemComponent({ chat, isActive, user, onClick }: UserItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[28px] border p-4 text-left transition",
        isActive
          ? "border-green-500/40 bg-[linear-gradient(180deg,rgba(34,197,94,0.16),rgba(15,15,15,0.96))]"
          : "border-[#1f1f1f] bg-[#0f0f0f] hover:border-[#2b2b2b] hover:bg-[#151515]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="truncate">{getDisplayName(user?.name, chat.peerId)}</span>
            {chat.isApproved ? (
              <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
            ) : (
              <MessageCircle className="h-4 w-4 text-[#9ca3af]" />
            )}
          </div>
          <div className="mt-1 truncate text-xs text-[#9ca3af]">
            {chat.lastMessage || (chat.isApproved ? "No messages yet" : "Connection request pending")}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              user?.isOnline ? "bg-[#22c55e] shadow-[0_0_14px_rgba(34,197,94,0.9)]" : "bg-[#303030]",
            )}
          />
          {chat.unreadCount > 0 ? (
            <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-[11px] font-semibold text-black">
              {chat.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 text-[11px] text-[#9ca3af]">
        {user?.isOnline ? "Online now" : `Last active ${formatLastActive(user?.lastActiveAt ?? 0)}`}
      </div>
    </button>
  );
}

export const UserItem = memo(UserItemComponent);
