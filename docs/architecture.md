# Architecture

## Overview

The app is a local-first peer messaging client with a small signaling server.

There are three main layers:

1. UI layer
2. Client state and persistence layer
3. Real-time transport layer

## UI Layer

Main UI files:

- [`components/ChatApp.tsx`](/d:/pro_projects/p2p_chat/components/ChatApp.tsx)
- [`components/UserList.tsx`](/d:/pro_projects/p2p_chat/components/UserList.tsx)
- [`components/ChatWindow.tsx`](/d:/pro_projects/p2p_chat/components/ChatWindow.tsx)
- [`components/MessageInput.tsx`](/d:/pro_projects/p2p_chat/components/MessageInput.tsx)
- [`components/MessageBubble.tsx`](/d:/pro_projects/p2p_chat/components/MessageBubble.tsx)

Responsibilities:

- Layout and responsiveness
- Sidebar interactions
- Connection request approvals
- Message actions like reply/delete
- Composer state display

## State Layer

Stores:

- [`store/useUserStore.ts`](/d:/pro_projects/p2p_chat/store/useUserStore.ts)
- [`store/useChatStore.ts`](/d:/pro_projects/p2p_chat/store/useChatStore.ts)

`useUserStore` manages:

- current user
- known users
- typing indicators
- incoming requests
- sent requests

`useChatStore` manages:

- chat list
- selected chat
- reply target
- message state updates
- local delete/read updates

## Persistence Layer

Persistence lives in [`lib/db.ts`](/d:/pro_projects/p2p_chat/lib/db.ts).

It stores:

- users
- chats
- messages

Why IndexedDB:

- survives refreshes
- works client-side without auth
- fits local-first MVP behavior

## Identity and Profile

Identity flow:

- [`hooks/usePeer.ts`](/d:/pro_projects/p2p_chat/hooks/usePeer.ts)
- [`lib/utils.ts`](/d:/pro_projects/p2p_chat/lib/utils.ts)

The app generates a UUID-based Peer ID once and reuses it from `localStorage`.

Display names are:

- requested on first run
- stored locally
- broadcast through the signaling server

## Presence and Socket Lifecycle

Presence flow lives in [`hooks/usePresence.ts`](/d:/pro_projects/p2p_chat/hooks/usePresence.ts).

Responsibilities:

- connect socket client
- register peer with name
- hydrate users/chats from IndexedDB
- update presence state from server events
- sync profile changes
- store incoming connection requests

## Messaging and Requests

Messaging flow lives in [`hooks/useMessages.ts`](/d:/pro_projects/p2p_chat/hooks/useMessages.ts).

Responsibilities:

- ensure chat existence
- send connection requests
- approve or reject requests
- send messages
- mark delivered/read
- reply to messages
- delete messages
- delete local conversations
- load chat messages from IndexedDB

## Real-Time Transport

Transport utilities:

- [`lib/socket.ts`](/d:/pro_projects/p2p_chat/lib/socket.ts)
- [`lib/webrtc.ts`](/d:/pro_projects/p2p_chat/lib/webrtc.ts)
- [`server/signalingServer.ts`](/d:/pro_projects/p2p_chat/server/signalingServer.ts)

Flow:

1. Socket.IO connects to `localhost:3001`
2. Signaling server tracks online peers
3. `simple-peer` negotiates WebRTC using `signal` events
4. Messages prefer WebRTC
5. Socket.IO relays when direct peer transport is unavailable

## Supporting Utilities

- [`lib/peer.ts`](/d:/pro_projects/p2p_chat/lib/peer.ts): typed builders for users, chats, messages, replies
- [`lib/types.ts`](/d:/pro_projects/p2p_chat/lib/types.ts): shared application types
- [`lib/cache.ts`](/d:/pro_projects/p2p_chat/lib/cache.ts): active user cache

## Constraints

- No authentication
- Identity is Peer ID only
- Local-first persistence
- Signaling server is intentionally lightweight
- Direct peer networking can fail; fallback matters
