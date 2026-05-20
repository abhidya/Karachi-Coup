# Karachi Coup

PeerJS-backed room flow for Karachi Coup with host/join identity, persisted room state, and public/private game snapshots.

## Run locally

```bash
npm install
npm run dev
```

## Build and test

```bash
npm run build
npm test
```

## Flow

- **Host** creates a room, publishes a room link, and controls the lobby/game state.
- **Join** enters the room code plus a display name.
- The host assigns a stable player identity from the client JOIN payload and persists room state in local storage.
- Clients keep a reusable nonce, can request resync, and receive both public and private snapshots from the host.

## Deployment

The Vite base path is configured for GitHub Pages at `/Karachi-Coup/`.

