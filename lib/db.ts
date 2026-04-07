import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Chat, Message, User } from "@/lib/types";
import { getMessagePreview } from "@/lib/utils";

const DB_NAME = "p2p-chat-db";
const DB_VERSION = 2;

type ChatRecord = Omit<Chat, "messages">;

interface P2PChatDB extends DBSchema {
  users: {
    key: string;
    value: User;
  };
  chats: {
    key: string;
    value: ChatRecord;
    indexes: {
      "by-peer-id": string;
      "by-last-message-at": number;
    };
  };
  messages: {
    key: string;
    value: Message;
    indexes: {
      "by-chat-id": string;
      "by-created-at": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<P2PChatDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<P2PChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", {
            keyPath: "peerId",
          });
        }

        if (!db.objectStoreNames.contains("chats")) {
          const chatsStore = db.createObjectStore("chats", {
            keyPath: "chatId",
          });
          chatsStore.createIndex("by-peer-id", "peerId", { unique: true });
          chatsStore.createIndex("by-last-message-at", "lastMessageAt");
        }

        if (!db.objectStoreNames.contains("messages")) {
          const messagesStore = db.createObjectStore("messages", {
            keyPath: "id",
          });
          messagesStore.createIndex("by-chat-id", "chatId");
          messagesStore.createIndex("by-created-at", "createdAt");
        }
      },
    });
  }

  return dbPromise;
}

function withChatDefaults(chat: Partial<ChatRecord> & Pick<ChatRecord, "chatId" | "peerId">): ChatRecord {
  return {
    chatId: chat.chatId,
    peerId: chat.peerId,
    lastMessage: chat.lastMessage ?? "",
    lastMessageAt: chat.lastMessageAt ?? 0,
    unreadCount: chat.unreadCount ?? 0,
    isApproved: chat.isApproved ?? false,
  };
}

export async function initDB() {
  return getDB();
}

export async function saveUser(user: User) {
  const db = await getDB();
  await db.put("users", user);
}

export async function getUsers() {
  const db = await getDB();
  return db.getAll("users");
}

export async function getUser(peerId: string) {
  const db = await getDB();
  return db.get("users", peerId);
}

export async function saveChat(chat: ChatRecord) {
  const db = await getDB();
  await db.put("chats", withChatDefaults(chat));
}

export async function getChats() {
  const db = await getDB();
  const chats = await db.getAllFromIndex("chats", "by-last-message-at");
  const messages = await db.getAll("messages");
  const messagesByChat = new Map<string, Message[]>();

  for (const message of messages) {
    const existing = messagesByChat.get(message.chatId) ?? [];
    existing.push(message);
    messagesByChat.set(message.chatId, existing);
  }

  return chats
    .map((chat) => ({
      ...withChatDefaults(chat),
      messages: (messagesByChat.get(chat.chatId) ?? []).sort(
        (left, right) => left.createdAt - right.createdAt,
      ),
    }))
    .sort((left, right) => right.lastMessageAt - left.lastMessageAt);
}

export async function getChat(chatId: string) {
  const db = await getDB();
  const chat = await db.get("chats", chatId);

  if (!chat) {
    return null;
  }

  const messages = await db.getAllFromIndex("messages", "by-chat-id", chatId);

  return {
    ...withChatDefaults(chat),
    messages: messages.sort((left, right) => left.createdAt - right.createdAt),
  };
}

export async function saveMessage(message: Message) {
  const db = await getDB();
  await db.put("messages", message);
}

export async function getMessage(messageId: string) {
  const db = await getDB();
  return db.get("messages", messageId);
}

export async function getMessagesByChat(chatId: string) {
  const db = await getDB();
  const messages = await db.getAllFromIndex("messages", "by-chat-id", chatId);
  return messages.sort((left, right) => left.createdAt - right.createdAt);
}

export async function updateMessageStatus(messageId: string, status: Message["status"]) {
  const db = await getDB();
  const message = await db.get("messages", messageId);

  if (!message) {
    return;
  }

  await db.put("messages", {
    ...message,
    status,
  });
}

export async function deleteMessage(messageId: string) {
  const db = await getDB();
  const message = await db.get("messages", messageId);

  if (!message) {
    return null;
  }

  const updatedMessage: Message = {
    ...message,
    content: "",
    deletedAt: Date.now(),
  };

  await db.put("messages", updatedMessage);
  await refreshChatSummary(message.chatId);
  return updatedMessage;
}

export async function markChatRead(chatId: string) {
  const db = await getDB();
  const chat = await db.get("chats", chatId);

  if (!chat) {
    return;
  }

  await db.put("chats", {
    ...withChatDefaults(chat),
    unreadCount: 0,
  });
}

export async function deleteChat(chatId: string) {
  const db = await getDB();
  const tx = db.transaction(["chats", "messages"], "readwrite");
  const messages = await tx.objectStore("messages").index("by-chat-id").getAllKeys(chatId);

  await Promise.all(messages.map((messageId) => tx.objectStore("messages").delete(messageId)));
  await tx.objectStore("chats").delete(chatId);
  await tx.done;
}

export async function refreshChatSummary(chatId: string) {
  const db = await getDB();
  const chat = await db.get("chats", chatId);

  if (!chat) {
    return;
  }

  const messages = await getMessagesByChat(chatId);
  const lastMessage = messages.at(-1);

  await db.put("chats", {
    ...withChatDefaults(chat),
    lastMessage: lastMessage ? getMessagePreview(lastMessage.content, lastMessage.deletedAt) : "",
    lastMessageAt: lastMessage?.createdAt ?? 0,
  });
}
