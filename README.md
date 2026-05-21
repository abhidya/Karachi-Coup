# Karachi Coup

Karachi Coup is a Karachi-themed bluffing party game inspired by Coup.

Cards are Connections, coins are Rupees, influence is Setting, challenges are Call Bakwaas, blocks are Use Setting, and Coup is Full Beizzati.

This repo is a static React + TypeScript + Vite app. It uses PeerJS data channels for browser-to-browser play. No backend, database, auth, server functions, Firebase, Supabase, or WebSocket server.

## What the MVP does

- Host creates a room.
- Players join by room code and display name.
- Host is authoritative.
- Each player gets only their own private Connections.
- Public state and private state are synced over PeerJS.
- Host state persists in `localStorage`.
- Hash routing keeps refreshes from 404ing on GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## End-to-end tests

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:github
```

The E2E suite runs against local Vite preview by default. The `test:e2e:github` script points at the deployed GitHub Pages URL.

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## GitHub Pages deployment

The Vite base path is set for `/Karachi-Coup/`.

Use the GitHub Actions workflow in `.github/workflows/deploy.yml` to build and publish `dist/` to GitHub Pages.

GitHub Pages Source should be set to **GitHub Actions**. The generated `dist/` folder is uploaded as the Pages artifact and should not be committed to the repo.

If the deployed URL is blank or stale, check the Actions logs and confirm `dist/index.html` was created successfully.

## How to play

1. Host opens the app and creates a room.
2. Share the room code or link.
3. Players join with a display name.
4. Host starts the game.
5. Host is the table authority only; the host should open a second tab or phone to play as a normal player.
6. Players take turns, bluff, call bakwaas, use setting, burn Connections, and try to be the last one standing.

## Asset naming notes

The app keeps image filenames behind `src/game/assets.ts` so components use semantic keys instead of repeated raw filenames.

If you need to add or rename public art, update `src/game/assets.ts` instead of scattering raw filenames through components.

## PeerJS limitations

- PeerJS signaling is external.
- The host is authoritative and can technically cheat.
- NAT, firewall, or browser issues may prevent some connections.
- TURN is not included in this MVP.
- Reconnect is best-effort, not guaranteed.
- Keep the host browser open during play.

## Room code convention

This MVP keeps the PeerJS room identifier direct and simple: host and clients both use the room code itself for room matching. The share link carries that same room code.

## Local workflow

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

## Important limitations

- PeerJS signaling is external.
- The host is authoritative and can technically cheat.
- NAT/firewall/TURN issues can block connections.
- Reconnect is best-effort.
- Keep the host browser open.
- This is for friends/local play, not ranked or gambling play.
