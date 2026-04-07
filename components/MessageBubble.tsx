"use client";

import { memo, useState } from "react";
import { CornerUpLeft, Trash2 } from "lucide-react";

import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  isOwn: boolean;
  message: Message;
  onDelete: (message: Message) => void;
  onReply: (message: Message) => void;
};

const statusLabel: Record<Message["status"], string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

function MessageBubbleComponent({ isOwn, message, onDelete, onReply }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn("group flex w-full", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn("flex max-w-[90%] items-end gap-2 md:max-w-[78%]", isOwn && "flex-row-reverse")}>
        <div
          className={cn(
            "rounded-3xl border px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.22)]",
            isOwn
              ? "border-green-500/35 bg-[linear-gradient(180deg,rgba(34,197,94,0.24),rgba(15,15,15,0.88))] text-white"
              : "border-[#1f1f1f] bg-[#0f0f0f] text-white",
          )}
        >
          {message.replyTo ? (
            <div className="mb-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-xs">
              <div className="font-semibold text-[#22c55e]">{message.replyTo.senderName}</div>
              <div className="mt-1 line-clamp-2 text-[#9ca3af]">{message.replyTo.content}</div>
            </div>
          ) : null}
          <p
            className={cn(
              "whitespace-pre-wrap break-words text-sm leading-6",
              Boolean(message.deletedAt) && "italic text-[#9ca3af]",
            )}
          >
            {message.deletedAt ? "This message was deleted" : message.content}
          </p>
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-[#9ca3af]">
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isOwn ? <span>{statusLabel[message.status]}</span> : null}
          </div>
        </div>

        <div className={cn("flex flex-col gap-2 transition", showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <button
            type="button"
            onClick={() => onReply(message)}
            className="rounded-full border border-[#1f1f1f] bg-[#0f0f0f] p-2 text-[#9ca3af] transition hover:border-[#22c55e]/40 hover:text-white"
            aria-label="Reply"
          >
            <CornerUpLeft className="h-4 w-4" />
          </button>
          {isOwn && !message.deletedAt ? (
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="rounded-full border border-[#1f1f1f] bg-[#0f0f0f] p-2 text-[#9ca3af] transition hover:border-red-500/40 hover:text-white"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
