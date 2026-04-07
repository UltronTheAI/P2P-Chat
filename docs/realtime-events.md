# Real-Time Events

## Socket.IO Events

Server file:

- [`server/signalingServer.ts`](/d:/pro_projects/p2p_chat/server/signalingServer.ts)

Client listeners:

- [`hooks/usePresence.ts`](/d:/pro_projects/p2p_chat/hooks/usePresence.ts)
- [`hooks/useMessages.ts`](/d:/pro_projects/p2p_chat/hooks/useMessages.ts)

## Presence Events

`register-peer`

- client -> server
- payload: `{ peerId, name }`
- registers socket ownership and display name

`active-peers`

- server -> all clients
- payload: online peer list with `peerId`, `name`, and `lastActiveAt`

`user-online`

- server -> other clients
- sent when a peer registers or updates recent presence

`user-offline`

- server -> other clients
- sent when a socket disconnects

`profile-update`

- client -> server -> all clients
- synchronizes display name changes

## WebRTC Signaling

`signal`

- client -> server -> target client
- carries `simple-peer` signaling payloads
- used to establish a direct WebRTC connection

## Messaging Events

`message`

- client -> peer
- preferred path: WebRTC
- fallback path: Socket.IO relay

`typing`

- client -> peer
- indicates temporary typing state

`message-delivered`

- receiver -> sender
- marks a message as delivered

`message-read`

- receiver -> sender
- marks a message as read

`message-deleted`

- sender -> receiver
- propagates a local delete marker to the other peer

## Connection Request Events

`connection-request`

- sender -> receiver
- used before opening a real conversation

`connection-response`

- receiver -> sender
- returns `approved` or `rejected`

## Persistence Rules

Events update IndexedDB when relevant:

- presence changes update `users`
- chat approval state updates `chats`
- incoming and outgoing messages update `messages`
- delete/read state updates message records and chat summaries

## Fallback Model

When WebRTC is connected:

- messages and typing flow over peer transport

When WebRTC is not connected:

- Socket.IO relays messaging events through the signaling server
