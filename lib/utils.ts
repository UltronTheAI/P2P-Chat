import { v4 as uuid } from "uuid";

const PEER_ID_STORAGE_KEY = "p2p-chat-peer-id";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getPeerId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existingPeerId = window.localStorage.getItem(PEER_ID_STORAGE_KEY);

  if (existingPeerId) {
    return existingPeerId;
  }

  const nextPeerId = uuid();
  window.localStorage.setItem(PEER_ID_STORAGE_KEY, nextPeerId);
  return nextPeerId;
}

export function createChatId(selfPeerId: string, peerId: string) {
  return [selfPeerId, peerId].sort().join(":");
}

export function sanitizeMessageInput(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 1000);
}

export function sanitizeNameInput(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 40);
}

export function formatLastActive(timestamp: number) {
  if (!timestamp) {
    return "Unknown";
  }

  const delta = Date.now() - timestamp;

  if (delta < 60_000) {
    return "Just now";
  }

  if (delta < 3_600_000) {
    return `${Math.floor(delta / 60_000)}m ago`;
  }

  if (delta < 86_400_000) {
    return `${Math.floor(delta / 3_600_000)}h ago`;
  }

  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function getDisplayName(name: string | null | undefined, peerId: string) {
  return name?.trim() || `Peer ${peerId.slice(0, 6)}`;
}

export function getMessagePreview(content: string, deletedAt?: number) {
  if (deletedAt) {
    return "Message deleted";
  }

  return content || "No messages yet";
}
