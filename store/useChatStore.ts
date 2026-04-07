"use client";

import { create } from "zustand";

import type { Chat, Message, MessageStatus } from "@/lib/types";
import { getMessagePreview } from "@/lib/utils";

type ChatState = {
  chats: Chat[];
  selectedChatId: string | null;
  replyTarget: Message | null;
  setChats: (chats: Chat[]) => void;
  selectChat: (chatId: string | null) => void;
  setReplyTarget: (message: Message | null) => void;
  upsertChat: (chat: Chat) => void;
  addMessage: (chatId: string, message: Message, isIncoming?: boolean) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  setMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  deleteMessageLocal: (chatId: string, messageId: string, deletedAt: number) => void;
  deleteChatLocal: (chatId: string) => void;
  markRead: (chatId: string) => void;
};

function sortChats(chats: Chat[]) {
  return [...chats].sort((left, right) => right.lastMessageAt - left.lastMessageAt);
}

function recalcChat(chat: Chat, messages: Message[]) {
  const orderedMessages = [...messages].sort((left, right) => left.createdAt - right.createdAt);
  const lastMessage = orderedMessages.at(-1);

  return {
    ...chat,
    messages: orderedMessages,
    lastMessage: lastMessage ? getMessagePreview(lastMessage.content, lastMessage.deletedAt) : "",
    lastMessageAt: lastMessage?.createdAt ?? 0,
  };
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  selectedChatId: null,
  replyTarget: null,
  setChats: (chats) => set({ chats: sortChats(chats) }),
  selectChat: (chatId) => set({ selectedChatId: chatId, replyTarget: null }),
  setReplyTarget: (message) => set({ replyTarget: message }),
  upsertChat: (chat) =>
    set((state) => {
      const chats = state.chats.filter((entry) => entry.chatId !== chat.chatId);
      chats.push(chat);
      return {
        chats: sortChats(chats),
      };
    }),
  addMessage: (chatId, message, isIncoming = false) =>
    set((state) => {
      const existingChat = state.chats.find((chat) => chat.chatId === chatId);

      if (!existingChat) {
        return state;
      }

      const nextChat = recalcChat(existingChat, [...existingChat.messages, message]);
      nextChat.unreadCount =
        isIncoming && state.selectedChatId !== chatId
          ? existingChat.unreadCount + 1
          : existingChat.unreadCount;

      return {
        chats: sortChats(
          state.chats.map((chat) => (chat.chatId === chatId ? nextChat : chat)),
        ),
      };
    }),
  setMessages: (chatId, messages) =>
    set((state) => ({
      chats: sortChats(
        state.chats.map((chat) =>
          chat.chatId === chatId ? recalcChat(chat, messages) : chat,
        ),
      ),
    })),
  setMessageStatus: (chatId, messageId, status) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.chatId === chatId
          ? {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === messageId ? { ...message, status } : message,
              ),
            }
          : chat,
      ),
    })),
  deleteMessageLocal: (chatId, messageId, deletedAt) =>
    set((state) => ({
      chats: sortChats(
        state.chats.map((chat) => {
          if (chat.chatId !== chatId) {
            return chat;
          }

          return recalcChat(
            chat,
            chat.messages.map((message) =>
              message.id === messageId
                ? { ...message, content: "", deletedAt }
                : message,
            ),
          );
        }),
      ),
      replyTarget:
        state.replyTarget?.id === messageId
          ? null
          : state.replyTarget,
    })),
  deleteChatLocal: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((chat) => chat.chatId !== chatId),
      selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
      replyTarget: state.selectedChatId === chatId ? null : state.replyTarget,
    })),
  markRead: (chatId) =>
    set((state) => {
      const targetChat = state.chats.find((chat) => chat.chatId === chatId);

      if (!targetChat || targetChat.unreadCount === 0) {
        return state;
      }

      return {
        chats: state.chats.map((chat) =>
          chat.chatId === chatId
            ? {
                ...chat,
                unreadCount: 0,
              }
            : chat,
        ),
      };
    }),
}));
