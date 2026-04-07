import { v4 as uuid } from "uuid";

import type { Chat, Message, MessageReply, User } from "@/lib/types";
import { createChatId } from "@/lib/utils";

export function createUser(peerId: string, isOnline = false, name: string | null = null): User {
  const now = Date.now();

  return {
    peerId,
    name,
    isOnline,
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createChat(selfPeerId: string, peerId: string, isApproved = false): Chat {
  return {
    chatId: createChatId(selfPeerId, peerId),
    peerId,
    messages: [],
    lastMessage: "",
    lastMessageAt: 0,
    unreadCount: 0,
    isApproved,
  };
}

export function createReply(message: Message, senderName: string): MessageReply {
  return {
    messageId: message.id,
    senderPeerId: message.senderPeerId,
    senderName,
    content: message.deletedAt ? "Message deleted" : message.content,
  };
}

export function createMessage(input: {
  chatId: string;
  senderPeerId: string;
  receiverPeerId: string;
  content: string;
  replyTo?: MessageReply;
}): Message {
  return {
    id: uuid(),
    chatId: input.chatId,
    senderPeerId: input.senderPeerId,
    receiverPeerId: input.receiverPeerId,
    content: input.content,
    createdAt: Date.now(),
    status: "sending",
    replyTo: input.replyTo,
  };
}
