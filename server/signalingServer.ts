import { createServer } from "http";
import { Server } from "socket.io";

type PeerPresence = {
  socketId: string;
  name: string | null;
  lastActiveAt: number;
};

type RelayPayload = {
  to: string;
  [key: string]: unknown;
};

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const activePeers = new Map<string, PeerPresence>();
const socketToPeerId = new Map<string, string>();

function emitActivePeers() {
  io.emit(
    "active-peers",
    Array.from(activePeers.entries()).map(([peerId, presence]) => ({
      peerId,
      name: presence.name,
      isOnline: true,
      lastActiveAt: presence.lastActiveAt,
    })),
  );
}

function updatePresence(peerId: string, overrides?: Partial<PeerPresence>) {
  const existing = activePeers.get(peerId);

  if (!existing) {
    return null;
  }

  const updatedPresence = {
    ...existing,
    ...overrides,
    lastActiveAt: Date.now(),
  };

  activePeers.set(peerId, updatedPresence);
  return updatedPresence;
}

function relayToPeer(eventName: string, payload: RelayPayload) {
  const target = activePeers.get(payload.to);

  if (!target) {
    return;
  }

  io.to(target.socketId).emit(eventName, payload);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-peer", (payload: { peerId: string; name: string | null }) => {
    const lastActiveAt = Date.now();

    activePeers.set(payload.peerId, {
      socketId: socket.id,
      name: payload.name,
      lastActiveAt,
    });
    socketToPeerId.set(socket.id, payload.peerId);

    socket.broadcast.emit("user-online", {
      peerId: payload.peerId,
      name: payload.name,
      isOnline: true,
      lastActiveAt,
    });
    emitActivePeers();
  });

  socket.on("profile-update", (payload: { peerId: string; name: string | null }) => {
    const presence = updatePresence(payload.peerId, { name: payload.name });

    if (!presence) {
      return;
    }

    io.emit("profile-update", {
      peerId: payload.peerId,
      name: payload.name,
      isOnline: true,
      lastActiveAt: presence.lastActiveAt,
    });
    emitActivePeers();
  });

  socket.on("signal", (payload: RelayPayload) => {
    if (typeof payload.from === "string") {
      updatePresence(payload.from);
    }

    relayToPeer("signal", payload);
  });

  socket.on("typing", (payload: RelayPayload) => {
    if (typeof payload.from === "string") {
      updatePresence(payload.from);
    }

    relayToPeer("typing", payload);
  });

  socket.on("message", (payload: RelayPayload) => {
    if (typeof payload.from === "string") {
      const presence = updatePresence(payload.from);

      if (presence) {
        socket.broadcast.emit("user-online", {
          peerId: payload.from,
          name: presence.name,
          isOnline: true,
          lastActiveAt: presence.lastActiveAt,
        });
      }
    }

    relayToPeer("message", payload);
  });

  socket.on("message-deleted", (payload: RelayPayload) => {
    relayToPeer("message-deleted", payload);
  });

  socket.on("message-delivered", (payload: RelayPayload) => {
    relayToPeer("message-delivered", payload);
  });

  socket.on("message-read", (payload: RelayPayload) => {
    relayToPeer("message-read", payload);
  });

  socket.on("connection-request", (payload: RelayPayload) => {
    relayToPeer("connection-request", payload);
  });

  socket.on("connection-response", (payload: RelayPayload) => {
    relayToPeer("connection-response", payload);
  });

  socket.on("disconnect", () => {
    const peerId = socketToPeerId.get(socket.id);

    if (!peerId) {
      return;
    }

    const presence = activePeers.get(peerId);
    const lastActiveAt = Date.now();

    socketToPeerId.delete(socket.id);
    activePeers.delete(peerId);

    socket.broadcast.emit("user-offline", {
      peerId,
      name: presence?.name ?? null,
      isOnline: false,
      lastActiveAt,
    });
    emitActivePeers();
  });
});

httpServer.listen(5000, () => {
  console.log("Signaling server running on port 5000");
});
