"use client";

import Peer from "simple-peer";
import type { Socket } from "socket.io-client";

import type {
  MessageStatusPayload,
  SignalPayload,
  SocketMessagePayload,
  TypingPayload,
} from "@/lib/types";

type WirePayload =
  | { type: "message"; payload: SocketMessagePayload }
  | { type: "typing"; payload: TypingPayload }
  | { type: "message-delivered"; payload: MessageStatusPayload }
  | { type: "message-read"; payload: MessageStatusPayload };

type PeerConnectionContext = {
  instance: Peer;
  connected: boolean;
};

type TransportListeners = {
  message: Set<(payload: SocketMessagePayload) => void>;
  typing: Set<(payload: TypingPayload) => void>;
  "message-delivered": Set<(payload: MessageStatusPayload) => void>;
  "message-read": Set<(payload: MessageStatusPayload) => void>;
};

export class PeerTransport {
  private socket: Socket;
  private selfPeerId: string;
  private peers = new Map<string, PeerConnectionContext>();
  private listeners: TransportListeners = {
    message: new Set(),
    typing: new Set(),
    "message-delivered": new Set(),
    "message-read": new Set(),
  };

  constructor(socket: Socket, selfPeerId: string) {
    this.socket = socket;
    this.selfPeerId = selfPeerId;
  }

  on(event: "message", listener: (payload: SocketMessagePayload) => void): () => void;
  on(event: "typing", listener: (payload: TypingPayload) => void): () => void;
  on(
    event: "message-delivered" | "message-read",
    listener: (payload: MessageStatusPayload) => void,
  ): () => void;
  on(
    event: keyof TransportListeners,
    listener:
      | ((payload: SocketMessagePayload) => void)
      | ((payload: TypingPayload) => void)
      | ((payload: MessageStatusPayload) => void),
  ) {
    const target = this.listeners[event] as Set<typeof listener>;
    target.add(listener);

    return () => {
      target.delete(listener);
    };
  }

  private emit(event: "message", payload: SocketMessagePayload): void;
  private emit(event: "typing", payload: TypingPayload): void;
  private emit(event: "message-delivered" | "message-read", payload: MessageStatusPayload): void;
  private emit(event: keyof TransportListeners, payload: SocketMessagePayload | TypingPayload | MessageStatusPayload) {
    (this.listeners[event] as Set<(value: typeof payload) => void>).forEach((listener) => listener(payload));
  }

  connectToPeer(peerId: string) {
    if (peerId === this.selfPeerId || this.peers.has(peerId)) {
      return;
    }

    this.createPeer(peerId, true);
  }

  handleIncomingSignal({ from, signal }: SignalPayload) {
    const existing = this.peers.get(from);

    if (existing) {
      existing.instance.signal(signal);
      return;
    }

    const peer = this.createPeer(from, false);
    peer.signal(signal);
  }

  private createPeer(peerId: string, initiator: boolean) {
    const instance = new Peer({
      initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    const context: PeerConnectionContext = {
      instance,
      connected: false,
    };

    instance.on("signal", (signal) => {
      this.socket.emit("signal", {
        from: this.selfPeerId,
        to: peerId,
        signal,
      } satisfies SignalPayload);
    });

    instance.on("connect", () => {
      const current = this.peers.get(peerId);

      if (current) {
        current.connected = true;
      }
    });

    instance.on("data", (raw) => {
      const packet = JSON.parse(new TextDecoder().decode(raw)) as WirePayload;

      if (packet.type === "message") {
        this.emit("message", packet.payload);
      } else if (packet.type === "typing") {
        this.emit("typing", packet.payload);
      } else if (packet.type === "message-delivered") {
        this.emit("message-delivered", packet.payload);
      } else {
        this.emit("message-read", packet.payload);
      }
    });

    instance.on("close", () => {
      this.peers.delete(peerId);
    });

    instance.on("error", () => {
      this.peers.delete(peerId);
    });

    this.peers.set(peerId, context);
    return instance;
  }

  sendMessage(peerId: string, payload: SocketMessagePayload) {
    return this.send(peerId, {
      type: "message",
      payload,
    });
  }

  sendTyping(peerId: string, payload: TypingPayload) {
    return this.send(peerId, {
      type: "typing",
      payload,
    });
  }

  sendDelivered(peerId: string, payload: MessageStatusPayload) {
    return this.send(peerId, {
      type: "message-delivered",
      payload,
    });
  }

  sendRead(peerId: string, payload: MessageStatusPayload) {
    return this.send(peerId, {
      type: "message-read",
      payload,
    });
  }

  private send(peerId: string, packet: WirePayload) {
    const peer = this.peers.get(peerId);

    if (!peer?.connected) {
      return false;
    }

    peer.instance.send(JSON.stringify(packet));
    return true;
  }

  destroy() {
    this.peers.forEach(({ instance }) => instance.destroy());
    this.peers.clear();
  }
}

let transport: PeerTransport | null = null;

export function createPeerTransport(socket: Socket, selfPeerId: string) {
  if (transport) {
    transport.destroy();
  }

  transport = new PeerTransport(socket, selfPeerId);
  return transport;
}
