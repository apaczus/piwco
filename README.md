# Piwco (Finance Quest)

Hackathon prototype: a mobile game that teaches entrepreneurs finance, one month at a time.
**All project decisions, progress and open questions are in [CLAUDE.md](CLAUDE.md). Read it first** (Claude Code reads it automatically).

## What's inside

| Folder | What |
|---|---|
| `apps/mobile` | Expo / React Native app: "Finance Quest" onboarding + playable January (mission, HUD, budget, lesson) |
| `apps/server` | Fastify backend (only `GET /health` so far) |
| `packages/engine` | Game engine: deterministic month simulation (seeded RNG, actions, month-end settlement, level goals), with tests |
| `packages/content` | Game content as JSON: curriculum (12 months), industries, household, onboarding questions |
| `docker-compose.yml` | PostgreSQL 18 (not used by the code yet) |

## Requirements

- **Node.js 24** and npm 11
- **Expo Go** on the phones (latest version from the App Store / Google Play)
- **Tailscale** on the computer and on the phones, if the phones are not on the same Wi-Fi as the computer
- Docker (only for Postgres, which the code doesn't use yet)

## Setup on a new computer

```bash
git clone https://github.com/apaczus/piwco.git
cd piwco
npm install
```

Check that everything works:

```bash
npm test -w @piwco/engine
npm run typecheck -w @piwco/mobile
```

## Run the app on phones

With Tailscale on the computer (the QR code points phones at the computer's Tailscale address):

```bash
npm run start:tailscale -w @piwco/mobile -- --clear
```

Without Tailscale (phones on the same Wi-Fi as the computer):

```bash
npm run start -w @piwco/mobile
```

Scan the QR code from the terminal with Expo Go. Changes in the code reach the phones by themselves (dev mode).
Production mode (`-- --no-dev --minify`) is smoother but Expo Go keeps a cached old version after changes: use it only for the final demo.

The first onboarding screen has a **temporary "Skip to game ›" button** that jumps straight into the game. Turn it off in `apps/mobile/src/devFlags.ts` before the final demo.

## Other commands

```bash
npm run dev -w @piwco/server          # backend on http://0.0.0.0:3000/health
docker compose up -d --wait           # Postgres on 127.0.0.1:5433 (user/password/db: piwco)
```
