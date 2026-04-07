"use client";

import { useCallback, useState } from "react";
import { Send, X } from "lucide-react";

import type { Message } from "@/lib/types";

type MessageInputProps = {
  disabled?: boolean;
  replyTarget: Message | null;
  replyLabel: string | null;
  onCancelReply: () => void;
  onSend: (content: string) => Promise<void> | void;
  onTyping: (content: string) => void;
};

export function MessageInput({
  disabled = false,
  replyTarget,
  replyLabel,
  onCancelReply,
  onSend,
  onTyping,
}: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(async () => {
    const nextValue = value.trim();

    if (!nextValue || disabled) {
      return;
    }

    await onSend(nextValue);
    setValue("");
    onTyping("");
  }, [disabled, onSend, onTyping, value]);

  return (
    <div className="border-t border-[#1f1f1f] bg-black/90 p-3 md:p-4">
      {replyTarget ? (
        <div className="mb-3 flex items-start justify-between rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#22c55e]">
              Replying to {replyLabel}
            </div>
            <div className="mt-1 truncate text-sm text-[#9ca3af]">
              {replyTarget.deletedAt ? "This message was deleted" : replyTarget.content}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-full border border-[#1f1f1f] p-2 text-[#9ca3af] transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-3 rounded-[28px] border border-[#1f1f1f] bg-[#0f0f0f] p-2 pl-4">
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            onTyping(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          maxLength={1000}
          placeholder={disabled ? "Approve a request or open a chat to start messaging" : "Type your message"}
          className="max-h-36 min-h-[54px] flex-1 resize-none bg-transparent py-3 text-sm text-white outline-none placeholder:text-[#6b7280]"
        />
        <button
          type="button"
          disabled={disabled || value.trim().length === 0}
          onClick={() => {
            void handleSubmit();
          }}
          className="inline-flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#22c55e] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#1f1f1f] disabled:text-[#9ca3af]"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
