"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:3001", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  return socket;
}
