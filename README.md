# P2P Chat

Dark-theme peer-to-peer messaging MVP built with Next.js, TypeScript, Socket.IO, `simple-peer`, Zustand, IndexedDB, and Tailwind CSS.

The app behaves like a lightweight WhatsApp-style messenger, but users are identified by a generated Peer ID instead of a phone number. Messages are stored locally, presence is synced through a signaling server, and chat delivery prefers WebRTC with Socket.IO fallback.

## Features

- Automatic Peer ID generation and local persistence
- First-run display name prompt
- Live presence and last-active tracking
- Connection requests with approve/reject flow
- Real-time messaging over WebRTC with Socket.IO fallback
- Reply to message
- Delete message
- Delete conversation locally
- Local-first storage with IndexedDB
- Desktop and mobile responsive chat layout
- Copy Peer ID action and collapsible desktop sidebar

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand
- IndexedDB via `idb`
- Socket.IO / Socket.IO Client
- WebRTC via `simple-peer`
- `lru-cache`
- `lucide-react`

## Project Structure

```text
app/
  chat/
components/
hooks/
lib/
server/
store/
types/
docs/
```

Key entry points:

- [`app/chat/page.tsx`](/d:/pro_projects/p2p_chat/app/chat/page.tsx): main route
- [`components/ChatApp.tsx`](/d:/pro_projects/p2p_chat/components/ChatApp.tsx): root client shell
- [`hooks/useMessages.ts`](/d:/pro_projects/p2p_chat/hooks/useMessages.ts): messaging, requests, reply/delete flow
- [`hooks/usePresence.ts`](/d:/pro_projects/p2p_chat/hooks/usePresence.ts): socket presence lifecycle
- [`lib/db.ts`](/d:/pro_projects/p2p_chat/lib/db.ts): IndexedDB persistence
- [`server/signalingServer.ts`](/d:/pro_projects/p2p_chat/server/signalingServer.ts): signaling and relay server

## Local Development

Install dependencies:

```bash
npm install
```

Run the Next.js app and signaling server together:

```bash
npm run dev:start
```

Or run them separately:

```bash
npm run dev
npm run server
```

App URL:

- `http://localhost:3000`

Signaling server:

- `http://localhost:3001`

## Scripts

- `npm run dev`: start Next.js dev server
- `npm run server`: start Socket.IO signaling server with nodemon
- `npm run dev:start`: start frontend and signaling server together
- `npm run lint`: run ESLint
- `npm run build`: production build
- `npm run start`: serve production build

## User Flow

1. App opens and generates a Peer ID on first load.
2. User is prompted for a display name.
3. Client registers with the signaling server.
4. Active users appear in the sidebar.
5. User sends a connection request by Peer ID or from the available users list.
6. Receiver approves or rejects.
7. Approved chats can send messages in real time.
8. Messages persist across refreshes through IndexedDB.

## Data Storage

IndexedDB database name:

- `p2p-chat-db`

Object stores:

- `users`
- `chats`
- `messages`

Storage responsibilities:

- Users: presence, display name, timestamps
- Chats: summary metadata, unread count, approval state
- Messages: full local conversation history, replies, deletion markers, statuses

## Real-Time Model

Transport strategy:

1. Socket.IO is used for registration, presence, request flow, and signaling.
2. WebRTC `simple-peer` is used for peer-to-peer message delivery when available.
3. Socket.IO acts as the fallback relay when a peer connection is not ready.

For event-level details, see [`docs/realtime-events.md`](/d:/pro_projects/p2p_chat/docs/realtime-events.md).

## Current Behavior Notes

- Conversation deletion is local-only.
- Message deletion is propagated to the other peer.
- Connection requests are required before messaging.
- Display names are user-provided and stored locally.

## Validation

The project has been verified with:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Documentation

- [`docs/architecture.md`](/d:/pro_projects/p2p_chat/docs/architecture.md)
- [`docs/realtime-events.md`](/d:/pro_projects/p2p_chat/docs/realtime-events.md)
