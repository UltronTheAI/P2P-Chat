"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { v4 as uuid } from "uuid";

import {
  deleteChat,
  deleteMessage,
  getChat,
  getMessage,
  getMessagesByChat,
  getUser,
  markChatRead,
  saveChat,
  saveMessage,
  saveUser,
  updateMessageStatus,
} from "@/lib/db";
import { createChat, createMessage, createReply, createUser } from "@/lib/peer";
import { getSocket } from "@/lib/socket";
import type {
  ConnectionRequest,
  ConnectionResponsePayload,
  Message,
  MessageDeletePayload,
  MessageStatusPayload,
  PendingMessagesPayload,
  SocketMessagePayload,
  TypingPayload,
} from "@/lib/types";
import { getDisplayName, getMessagePreview, sanitizeMessageInput } from "@/lib/utils";
import { createPeerTransport } from "@/lib/webrtc";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";

function toSocketMessagePayload(message: Message): SocketMessagePayload {
  return {
    id: message.id,
    chatId: message.chatId,
    from: message.senderPeerId,
    to: message.receiverPeerId,
    content: message.content,
    createdAt: message.createdAt,
    status: "sent",
    replyTo: message.replyTo,
    deletedAt: message.deletedAt,
  };
}

function createStatusPayload(
  message: Message,
  status: "delivered" | "read",
): MessageStatusPayload {
  return {
    chatId: message.chatId,
    messageId: message.id,
    from: message.receiverPeerId,
    to: message.senderPeerId,
    status,
    createdAt: Date.now(),
  };
}

export function useMessages(peerId: string, enabled: boolean) {
  const socket = useMemo(() => getSocket(), []);
  const transportRef = useRef<ReturnType<typeof createPeerTransport> | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const chats = useChatStore((state) => state.chats);
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const replyTarget = useChatStore((state) => state.replyTarget);
  const selectChat = useChatStore((state) => state.selectChat);
  const setReplyTarget = useChatStore((state) => state.setReplyTarget);
  const upsertChat = useChatStore((state) => state.upsertChat);
  const addMessage = useChatStore((state) => state.addMessage);
  const setMessages = useChatStore((state) => state.setMessages);
  const setMessageStatus = useChatStore((state) => state.setMessageStatus);
  const deleteMessageLocal = useChatStore((state) => state.deleteMessageLocal);
  const deleteChatLocal = useChatStore((state) => state.deleteChatLocal);
  const markRead = useChatStore((state) => state.markRead);

  const upsertUser = useUserStore((state) => state.upsertUser);
  const setTypingState = useUserStore((state) => state.setTypingState);
  const upsertSentRequest = useUserStore((state) => state.upsertSentRequest);
  const resolveRequest = useUserStore((state) => state.resolveRequest);

  const ensureChat = useCallback(
    async (remotePeerId: string, isApproved = false) => {
      const chatId = [peerId, remotePeerId].sort().join(":");
      const existingChat = useChatStore.getState().chats.find((chat) => chat.chatId === chatId);

      if (existingChat) {
        if (isApproved && !existingChat.isApproved) {
          const approvedChat = { ...existingChat, isApproved: true };
          upsertChat(approvedChat);
          await saveChat({
            chatId: approvedChat.chatId,
            peerId: approvedChat.peerId,
            lastMessage: approvedChat.lastMessage,
            lastMessageAt: approvedChat.lastMessageAt,
            unreadCount: approvedChat.unreadCount,
            isApproved: true,
          });
          return approvedChat;
        }

        return existingChat;
      }

      const persistedChat = await getChat(chatId);
      if (persistedChat) {
        const nextChat = isApproved ? { ...persistedChat, isApproved: true } : persistedChat;
        upsertChat(nextChat);
        return nextChat;
      }

      const newChat = createChat(peerId, remotePeerId, isApproved);
      await saveChat({
        chatId: newChat.chatId,
        peerId: newChat.peerId,
        lastMessage: newChat.lastMessage,
        lastMessageAt: newChat.lastMessageAt,
        unreadCount: newChat.unreadCount,
        isApproved: newChat.isApproved,
      });
      upsertChat(newChat);

      const existingUser = await getUser(remotePeerId);
      if (!existingUser) {
        const nextUser = createUser(remotePeerId);
        await saveUser(nextUser);
        upsertUser(nextUser);
      }

      return newChat;
    },
    [peerId, upsertChat, upsertUser],
  );

  const emitDelivered = useCallback(
    (message: Message) => {
      const payload = createStatusPayload(message, "delivered");
      const sentViaPeer =
        transportRef.current?.sendDelivered(message.senderPeerId, payload) ?? false;

      if (!sentViaPeer) {
        socket.emit("message-delivered", payload);
      }
    },
    [socket],
  );

  const emitRead = useCallback(
    (message: Message) => {
      const payload = createStatusPayload(message, "read");
      const sentViaPeer = transportRef.current?.sendRead(message.senderPeerId, payload) ?? false;

      if (!sentViaPeer) {
        socket.emit("message-read", payload);
      }
    },
    [socket],
  );

  const handleIncomingMessage = useCallback(
    async (payload: SocketMessagePayload) => {
      const chat = await ensureChat(payload.from, true);
      const incomingMessage: Message = {
        id: payload.id,
        chatId: payload.chatId,
        senderPeerId: payload.from,
        receiverPeerId: payload.to,
        content: payload.content,
        createdAt: payload.createdAt,
        status: "delivered",
        replyTo: payload.replyTo,
        deletedAt: payload.deletedAt,
      };

      const existingMessage = await getMessage(incomingMessage.id);
      if (existingMessage) {
        addMessage(chat.chatId, {
          ...existingMessage,
          ...incomingMessage,
          status:
            existingMessage.status === "read"
              ? "read"
              : existingMessage.status === "delivered"
                ? "delivered"
                : incomingMessage.status,
        });
        emitDelivered({
          ...existingMessage,
          ...incomingMessage,
          status: existingMessage.status,
        });

        if (selectedChatId === chat.chatId && existingMessage.status !== "read") {
          await updateMessageStatus(incomingMessage.id, "read");
          setMessageStatus(chat.chatId, incomingMessage.id, "read");
          emitRead({ ...incomingMessage, status: "read" });
        }

        return;
      }

      await saveMessage(incomingMessage);
      await saveChat({
        chatId: chat.chatId,
        peerId: chat.peerId,
        lastMessage: getMessagePreview(incomingMessage.content, incomingMessage.deletedAt),
        lastMessageAt: incomingMessage.createdAt,
        unreadCount: selectedChatId === chat.chatId ? 0 : chat.unreadCount + 1,
        isApproved: true,
      });

      addMessage(chat.chatId, incomingMessage, true);
      emitDelivered(incomingMessage);

      if (selectedChatId === chat.chatId) {
        await updateMessageStatus(incomingMessage.id, "read");
        setMessageStatus(chat.chatId, incomingMessage.id, "read");
        emitRead({ ...incomingMessage, status: "read" });
      }
    },
    [addMessage, emitDelivered, emitRead, ensureChat, selectedChatId, setMessageStatus],
  );

  useEffect(() => {
    if (!enabled || !peerId) {
      return;
    }

    const transport = createPeerTransport(socket, peerId);
    transportRef.current = transport;

    const offMessage = transport.on("message", (payload) => {
      void handleIncomingMessage(payload);
    });

    const offTyping = transport.on("typing", (payload) => {
      setTypingState({ peerId: payload.from, isTyping: payload.isTyping, updatedAt: Date.now() });
    });

    const offDelivered = transport.on("message-delivered", (payload) => {
      void updateMessageStatus(payload.messageId, "delivered");
      setMessageStatus(payload.chatId, payload.messageId, "delivered");
    });

    const offRead = transport.on("message-read", (payload) => {
      void updateMessageStatus(payload.messageId, "read");
      setMessageStatus(payload.chatId, payload.messageId, "read");
    });

    const onSignal = (payload: { from: string; signal: unknown }) => {
      transport.handleIncomingSignal({ from: payload.from, to: peerId, signal: payload.signal });
    };

    const onSocketMessage = (payload: SocketMessagePayload) => {
      void handleIncomingMessage(payload);
    };

    const onTyping = (payload: TypingPayload) => {
      setTypingState({ peerId: payload.from, isTyping: payload.isTyping, updatedAt: Date.now() });
    };

    const onDelivered = (payload: MessageStatusPayload) => {
      void updateMessageStatus(payload.messageId, "delivered");
      setMessageStatus(payload.chatId, payload.messageId, "delivered");
    };

    const onRead = (payload: MessageStatusPayload) => {
      void updateMessageStatus(payload.messageId, "read");
      setMessageStatus(payload.chatId, payload.messageId, "read");
    };

    const onDeleted = (payload: MessageDeletePayload) => {
      deleteMessageLocal(payload.chatId, payload.messageId, payload.deletedAt);
      void deleteMessage(payload.messageId);
    };

    const onConnectionResponse = (payload: ConnectionResponsePayload) => {
      resolveRequest(payload.requestId);

      if (payload.status === "approved") {
        void ensureChat(payload.fromPeerId, true).then((chat) => {
          selectChat(chat.chatId);
        });
      }
    };

    const onPendingMessages = (payload: PendingMessagesPayload) => {
      payload.forEach((message) => {
        void handleIncomingMessage(message);
      });
    };

    socket.on("signal", onSignal);
    socket.on("message", onSocketMessage);
    socket.on("typing", onTyping);
    socket.on("message-delivered", onDelivered);
    socket.on("message-read", onRead);
    socket.on("message-deleted", onDeleted);
    socket.on("connection-response", onConnectionResponse);
    socket.on("pending-messages", onPendingMessages);

    return () => {
      offMessage();
      offTyping();
      offDelivered();
      offRead();
      socket.off("signal", onSignal);
      socket.off("message", onSocketMessage);
      socket.off("typing", onTyping);
      socket.off("message-delivered", onDelivered);
      socket.off("message-read", onRead);
      socket.off("message-deleted", onDeleted);
      socket.off("connection-response", onConnectionResponse);
      socket.off("pending-messages", onPendingMessages);
      transport.destroy();
    };
  }, [
    deleteMessageLocal,
    enabled,
    ensureChat,
    handleIncomingMessage,
    peerId,
    resolveRequest,
    selectChat,
    setMessageStatus,
    setTypingState,
    socket,
  ]);

  const openChat = useCallback(
    async (remotePeerId: string) => {
      const existingChat = useChatStore.getState().chats.find((entry) => entry.peerId === remotePeerId);
      const chat = await ensureChat(remotePeerId, existingChat?.isApproved ?? false);
      selectChat(chat.chatId);
      transportRef.current?.connectToPeer(remotePeerId);
      const messages = await getMessagesByChat(chat.chatId);
      setMessages(chat.chatId, messages);
    },
    [ensureChat, selectChat, setMessages],
  );

  const requestConnection = useCallback(
    async (remotePeerId: string) => {
      const existingChat = await ensureChat(remotePeerId, false);
      if (existingChat.isApproved) {
        await openChat(remotePeerId);
        return;
      }

      const currentUser = useUserStore.getState().currentUser;
      const request: ConnectionRequest = {
        id: uuid(),
        fromPeerId: peerId,
        fromName: getDisplayName(currentUser?.name, peerId),
        toPeerId: remotePeerId,
        status: "pending",
        createdAt: Date.now(),
      };

      upsertSentRequest(request);
      socket.emit("connection-request", { ...request, to: remotePeerId });
    },
    [ensureChat, openChat, peerId, socket, upsertSentRequest],
  );

  const approveConnection = useCallback(
    async (requestId: string, remotePeerId: string) => {
      const currentUser = useUserStore.getState().currentUser;
      const chat = await ensureChat(remotePeerId, true);
      resolveRequest(requestId);
      socket.emit("connection-response", {
        requestId,
        fromPeerId: peerId,
        fromName: getDisplayName(currentUser?.name, peerId),
        toPeerId: remotePeerId,
        to: remotePeerId,
        status: "approved",
        createdAt: Date.now(),
      });
      selectChat(chat.chatId);
      const messages = await getMessagesByChat(chat.chatId);
      setMessages(chat.chatId, messages);
    },
    [ensureChat, peerId, resolveRequest, selectChat, setMessages, socket],
  );

  const rejectConnection = useCallback(
    (requestId: string, remotePeerId: string) => {
      const currentUser = useUserStore.getState().currentUser;
      resolveRequest(requestId);
      socket.emit("connection-response", {
        requestId,
        fromPeerId: peerId,
        fromName: getDisplayName(currentUser?.name, peerId),
        toPeerId: remotePeerId,
        to: remotePeerId,
        status: "rejected",
        createdAt: Date.now(),
      });
    },
    [peerId, resolveRequest, socket],
  );

  const sendMessage = useCallback(
    async (remotePeerId: string, content: string) => {
      const sanitized = sanitizeMessageInput(content);
      if (!sanitized) {
        return false;
      }

      const existingChat = useChatStore.getState().chats.find((entry) => entry.peerId === remotePeerId);
      const chat = await ensureChat(remotePeerId, existingChat?.isApproved ?? false);
      if (!chat.isApproved) {
        return false;
      }

      transportRef.current?.connectToPeer(remotePeerId);
      const currentUser = useUserStore.getState().currentUser;
      const message = createMessage({
        chatId: chat.chatId,
        senderPeerId: peerId,
        receiverPeerId: remotePeerId,
        content: sanitized,
        replyTo: replyTarget
          ? createReply(replyTarget, getDisplayName(currentUser?.name, peerId))
          : undefined,
      });

      addMessage(chat.chatId, message);
      await saveMessage(message);
      await saveChat({
        chatId: chat.chatId,
        peerId: chat.peerId,
        lastMessage: getMessagePreview(sanitized),
        lastMessageAt: message.createdAt,
        unreadCount: chat.unreadCount,
        isApproved: true,
      });

      const socketPayload = toSocketMessagePayload(message);
      const sentViaPeer = transportRef.current?.sendMessage(remotePeerId, socketPayload) ?? false;
      if (!sentViaPeer) {
        socket.emit("message", socketPayload);
      }

      await updateMessageStatus(message.id, "sent");
      setMessageStatus(chat.chatId, message.id, "sent");
      setReplyTarget(null);

      const user = useUserStore.getState().users.find((entry) => entry.peerId === peerId);
      if (user) {
        await saveUser({ ...user, lastActiveAt: Date.now(), updatedAt: Date.now() });
      }

      return true;
    },
    [addMessage, ensureChat, peerId, replyTarget, setMessageStatus, setReplyTarget, socket],
  );

  const removeMessage = useCallback(
    async (message: Message) => {
      const deleted = await deleteMessage(message.id);
      if (!deleted) {
        return;
      }

      deleteMessageLocal(message.chatId, message.id, deleted.deletedAt ?? Date.now());
      socket.emit("message-deleted", {
        chatId: message.chatId,
        messageId: message.id,
        from: peerId,
        to: message.receiverPeerId === peerId ? message.senderPeerId : message.receiverPeerId,
        deletedAt: deleted.deletedAt,
      });
    },
    [deleteMessageLocal, peerId, socket],
  );

  const removeConversation = useCallback(
    async (chatId: string) => {
      await deleteChat(chatId);
      deleteChatLocal(chatId);
    },
    [deleteChatLocal],
  );

  const sendTyping = useCallback(
    (remotePeerId: string, isTyping: boolean) => {
      if (!remotePeerId) {
        return;
      }

      transportRef.current?.connectToPeer(remotePeerId);
      const payload: TypingPayload = { from: peerId, to: remotePeerId, isTyping };
      const sentViaPeer = transportRef.current?.sendTyping(remotePeerId, payload) ?? false;
      if (!sentViaPeer) {
        socket.emit("typing", payload);
      }
    },
    [peerId, socket],
  );

  const queueTyping = useCallback(
    (remotePeerId: string, content: string) => {
      const hasContent = sanitizeMessageInput(content).length > 0;
      sendTyping(remotePeerId, hasContent);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        sendTyping(remotePeerId, false);
      }, 1200);
    },
    [sendTyping],
  );

  const markChatAsRead = useCallback(
    async (chatId: string) => {
      const chat = useChatStore.getState().chats.find((entry) => entry.chatId === chatId);
      if (!chat) {
        return;
      }

      const unreadMessages = chat.messages.filter(
        (message) => message.receiverPeerId === peerId && message.status !== "read",
      );
      if (chat.unreadCount === 0 && unreadMessages.length === 0) {
        return;
      }

      markRead(chatId);
      await markChatRead(chatId);
      for (const message of unreadMessages) {
        await updateMessageStatus(message.id, "read");
        setMessageStatus(chatId, message.id, "read");
        emitRead({ ...message, status: "read" });
      }
    },
    [emitRead, markRead, peerId, setMessageStatus],
  );

  return {
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
  };
}
