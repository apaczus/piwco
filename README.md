# Piwco (Finance Quest)

Hackathon prototype: a mobile game that teaches entrepreneurs finance, one month at a time.
**All project decisions, progress and open questions are in [CLAUDE.md](CLAUDE.md). Read it first** (Claude Code reads it automatically).

## Try it (jury)

**Play in the browser: https://apaczus.github.io/piwco/**

- **On a computer:** the page shows the full app inside a phone frame. Click and drag like on a phone (swipe the lesson cards, drag the sliders). Sound is on: the speaker icon in the game turns it off.
- **On a phone:** open the same link (or scan the QR code on the page): the app opens full screen in the phone's browser, nothing to install. Direct link: https://apaczus.github.io/piwco/app/
- **The short survey sets your starting point.** Rate your finance knowledge 1–2 to start with January (budget and cash flow), 3–5 to go straight to investing (August) and credit (September, October). Choose "private person" or "entrepreneur": entrepreneurs pick a business (Gastronomy, IT & Software or Manufacturing).
- **In a hurry?** "Skip to game ›" (top right of the survey) starts with a demo player (a small restaurant owner who knows the basics).
- The web version is built automatically from `master` by GitHub Actions (`.github/workflows/web.yml`). Haptics only work in the native app.

### Native app on a phone (Expo Go)

The native version runs from a developer computer, not from GitHub:

1. Install **Expo Go** (App Store / Google Play) on the phone.
2. On a computer with Node.js 24: `git clone https://github.com/apaczus/piwco.git && cd piwco && npm install`
3. `npm run start -w @piwco/mobile` (phone and computer on the same Wi-Fi).
4. Scan the QR code from the terminal: with the camera on iPhone, from inside Expo Go on Android.

## What's inside

| Folder | What |
|---|---|
| `apps/mobile` | Expo / React Native app (iOS, Android, web): onboarding, playable January, investing chapter, credit lessons, city |
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

The onboarding has a **"Skip to game ›" button** (asks first, then starts with demo data). It can be turned off in `apps/mobile/src/devFlags.ts`.

Build the web version locally (same as GitHub Actions): `npm run build:web -w @piwco/mobile` → `apps/mobile/dist` (the page with the phone frame at the root, the app in `app/`, base URL `/piwco/app`).

## Other commands

```bash
npm run dev -w @piwco/server          # backend on http://0.0.0.0:3000/health
docker compose up -d --wait           # Postgres on 127.0.0.1:5433 (user/password/db: piwco)
```
