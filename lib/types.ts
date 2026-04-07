export type MessageStatus = "sending" | "sent" | "delivered" | "read";
export type ConnectionRequestStatus = "pending" | "approved" | "rejected";

export type User = {
  peerId: string;
  name: string | null;
  isOnline: boolean;
  lastActiveAt: number;
  createdAt: number;
  updatedAt: number;
};

export type MessageReply = {
  messageId: string;
  senderPeerId: string;
  senderName: string;
  content: string;
};

export type Message = {
  id: string;
  chatId: string;
  senderPeerId: string;
  receiverPeerId: string;
  content: string;
  createdAt: number;
  status: MessageStatus;
  replyTo?: MessageReply;
  deletedAt?: number;
};

export type Chat = {
  chatId: string;
  peerId: string;
  messages: Message[];
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  isApproved: boolean;
};

export type TypingState = {
  peerId: string;
  isTyping: boolean;
  updatedAt: number;
};

export type ActivePeerPayload = {
  peerId: string;
  name: string | null;
  isOnline: boolean;
  lastActiveAt: number;
};

export type ProfilePayload = {
  peerId: string;
  name: string | null;
};

export type SignalPayload = {
  from: string;
  to: string;
  signal: unknown;
};

export type TypingPayload = {
  from: string;
  to: string;
  isTyping: boolean;
};

export type SocketMessagePayload = {
  id: string;
  chatId: string;
  from: string;
  to: string;
  content: string;
  createdAt: number;
  status: Exclude<MessageStatus, "sending">;
  replyTo?: MessageReply;
  deletedAt?: number;
};

export type MessageStatusPayload = {
  chatId: string;
  messageId: string;
  from: string;
  to: string;
  status: Exclude<MessageStatus, "sending" | "sent">;
  createdAt: number;
};

export type MessageDeletePayload = {
  chatId: string;
  messageId: string;
  from: string;
  to: string;
  deletedAt: number;
};

export type ConnectionRequest = {
  id: string;
  fromPeerId: string;
  fromName: string;
  toPeerId: string;
  status: ConnectionRequestStatus;
  createdAt: number;
};

export type ConnectionRequestPayload = ConnectionRequest;

export type ConnectionResponsePayload = {
  requestId: string;
  fromPeerId: string;
  fromName: string;
  toPeerId: string;
  status: Exclude<ConnectionRequestStatus, "pending">;
  createdAt: number;
};
