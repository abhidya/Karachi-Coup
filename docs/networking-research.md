# Networking research and decision

Date: 2026-06-07

## What failed

The GitHub Pages build previously used PeerJS with the default PeerServer Cloud. Manual production reproduction hit repeated browser console errors like:

- `WebSocket connection to 'wss://0.peerjs.com/peerjs?...' failed: Error during WebSocket handshake: Unexpected response code: 429`

That means the shared PeerJS signaling service was rate-limiting the host and clients. Backoff reduced the tight retry storm, but it could not make the shared service reliable.

## Evidence

- WebRTC still needs signaling to let peers discover each other and exchange negotiation data; WebRTC does not standardize that signaling transport.
  - MDN: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- PeerJS uses PeerServer for metadata/signaling. Its own server docs say the default is the free cloud server and production apps can host their own PeerServer.
  - PeerServer getting started: https://peerjs.com/server/getting-started
  - PeerServer Cloud: https://peerjs.com/server/cloud
- PeerServer Cloud is shared with other users and PeerJS says high-traffic apps should host their own PeerServer.
  - https://peerjs.com/server/cloud
- Trystero provides WebRTC room discovery/actions without deploying our own signaling service, using decentralized strategies such as Nostr by default.
  - https://github.com/dmotz/trystero
  - https://trystero.dev/
- A truly production-grade game should move authority and room state to a backend designed for coordination.
  - Cloudflare Durable Objects are designed for coordinating multiple clients, including multiplayer games, and are available on the Workers Free plan with request/duration limits.
    - https://developers.cloudflare.com/durable-objects/
    - https://developers.cloudflare.com/durable-objects/platform/pricing/
  - Colyseus is an open-source authoritative multiplayer game server framework with rooms, matchmaking, and state synchronization.
    - https://docs.colyseus.io/

## Decision

For the GitHub Pages deployment, replace PeerJS Cloud with Trystero:

- Keeps the site static; no GitHub Pages backend or secret API key needed.
- Removes the specific 429 failure mode from `0.peerjs.com`.
- Lets the app keep its current host-authoritative game protocol: host owns reducer state, clients send intents, host sends public/private snapshots.
- Avoids maintaining low-level signaling/reconnect code ourselves.

## Boundary

This is **demo-ready static multiplayer**, not the final production architecture.

Remaining production risks:

- Public/decentralized signaling relays are still external infrastructure we do not control.
- Browser-hosted authority means the host tab is the server; if it closes, the room is gone.
- Clients share a room and the app trusts host-like server messages after WELCOME. For casual private room-code play this is acceptable; for adversarial/public play it is not.
- Strict NAT/firewall cases require TURN. This is now wired in: `src/network/trysteroConfig.ts` sets `rtcConfig.iceServers` with Google STUN plus the [Open Relay Project](https://www.metered.ca/tools/openrelay/) free public TURN servers (ports 80/443 and 443/tcp), passed through to Trystero's `RTCPeerConnection`. This keeps the site static with no backend or secret to manage. Caveat: Open Relay is a shared free service with usage quotas and no SLA — fine for a demo, but a self-hosted/credentialed TURN (e.g. coturn, Metered, or Cloudflare TURN) injected via build-time `VITE_*` env vars + GitHub Secrets is the path for production reliability.

## If we want real production later

Preferred next architecture: GitHub Pages frontend + Cloudflare Durable Object room backend.

Why:

- One Durable Object per room gives strongly coordinated room state.
- No browser tab has to be the server.
- WebSocket hibernation keeps low/idle usage cheap.
- Free plan can cover small demos; paid plan gives predictable scale. Track limits before public launch.

Alternative: Colyseus if we want a full Node game-server framework and are willing to host a server separately.
