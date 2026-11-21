# Piwco: project context

> Claude reads this file at the start of every session. **Update it after every decision.**
> Last updated: 2026-11-21

## Handoff: continuing the project (read first in a new session)

- This file is the full memory of the first working session: every decision, the reasons, what is built, what is open. Setup and run commands for humans are in `README.md`.
- **Where we stopped (2026-11-21):** onboarding (Finance Quest design) + playable January with the "dopamine" start (welcome screen, mission, HUD, budget, lesson) are built (steps 11–14 below). Waiting for: the user's feedback on the new game start on phones; team review of the numbers (`industries.json`, `household.json`) and lesson cards; decisions listed under UNDECIDED.
- **Open design problem:** in month 1 the company can't fail with the current numbers (see step 13 "Finding"). Proposed fix: random events at the start of the month (planned anyway), before February.
- **Suggested next steps:** user feedback on the game start → random events → map onboarding answers to the starting state (personal side scales with income) → February (emergency fund) and March (insurance) → city → server recomputation + leaderboard.
- **On the developer laptop:** Metro runs in a terminal tab (`npm run start:tailscale -w @piwco/mobile -- --clear`), the phones reach it over Tailscale (`100.100.123.81`). Postgres container `hackaton-postgres-1` exists but isn't used yet.
- **On another computer:** `git clone https://github.com/apaczus/piwco.git && npm install`. The Tailscale address will be different: the phones need access to that computer (its own Tailscale share, or the same Wi-Fi with `npm run start -w @piwco/mobile`).
- The original conversation was exported locally to `~/Downloads/session-export-*.zip` on the developer laptop (not in the repo: it contains personal data).

## Collaboration rules (most important, always follow)

1. **Don't guess.** If something is not in the "DECIDED" section, it is NOT decided. Ask before making the decision.
2. **Before every step, list:** exactly what you will do, which files you will create or change, which dependencies you will install (name + why) and which assumptions you make (marked as ASSUMPTION). Then wait for approval.
3. **Ask questions in batches** (3–7 at a time), ideally with options, a recommendation and a short justification.
4. **One step = one small, working, testable thing.** Don't do several steps at once.
   - Exception (decided): pure configuration micro-steps (no logic) may be merged into one step.
5. **After every step, write:** what you did, how to test it (concrete commands), what you propose as the next step. Then STOP and wait.
6. **Don't add anything that wasn't asked for** (features, libraries, files). If something is needed, propose it and ask.
7. **Call out contradictions, ambiguities and bad ideas directly**, before you start.
8. **Explain briefly and practically**, no theory, but so that it's clear why something is done the way it is.

Also:
- **Claude runs test commands itself** (installs, tests, server, curl) and shows the result. The user only does what Claude can't: sudo, logging in to accounts, testing on phones.
- Commands for the user always include `cd` to the project folder, or say clearly where to run them.
- Chat with the user in Polish. This file, code and in-game texts are in English.
- The team has one programmer; the rest of the team doesn't code.
- Commit only on explicit request. The repo is local; push to GitHub only on request.

## About the project

Mobile educational game about finance for entrepreneurs. Hackathon theme: how to make learning finance so attractive that entrepreneurs seek it out themselves.

- **Onboarding:** questions about personal finances (car, house, insurance, loans, savings/investments) and the business (industry, general description). Answers as ranges / yes-no, no exact amounts.
- **Starting state:** the baseline depends on the industry (e.g. food service → a small restaurant, plus own house and car). Onboarding answers **modify the starting state**: personal-finance answers change personal finances (someone with debts starts differently from someone with 3M in stocks), business-finance answers change the business state. Exactly how answers map to numbers: UNDECIDED.
- **Levels:** 1 level = 1 month.
- **HUD (top right):** key numbers for the business and personal finances (balance, revenue, costs, arrears).
- **Action bar (left, collapsible):** loan repayment, employees, purchases, etc. More actions unlock with each level.
- **Random events:** negative (e.g. car breakdown without insurance) and positive (e.g. inheritance). Onboarding answers affect which events occur.
- **"End month":** the system checks the level goal. Success → lesson card, next level, the city grows. Failure → "what went wrong" screen, replay the same month (same seed).
- **City view:** grows with every good decision of the player.
- **Later:** leaderboard, friends, "play the same month as me" challenges, AI that roasts the player's decisions.

## Learning program (curriculum)

Source: `program_nauki.docx` from the team (Polish; the file ends mid-sentence in month 12). 1 level = 1 month = 1 topic. Each month has lesson points and a **challenge** (= the level goal).

| Month | Topic | Challenge (level goal) |
|---|---|---|
| 1 Jan | Budget and cash flow | Build a monthly budget, survive the month without a negative balance. Separate private and business money. |
| 2 Feb | Emergency fund | Put aside the first part of an emergency fund while paying current bills and a sudden small cost. |
| 3 Mar | Insurance and risk | Choose policies (personal + business) **before** a random event. |
| 4 Apr | Taxes (income tax, VAT, contributions) | Set aside cash for a tax deadline without touching the emergency fund. |
| 5 May | Personal and business debt | Compare two loan offers, pay an installment on a tight budget. |
| 6 Jun | Debt financing (bank loan, leasing, overdraft, bonds) | Finance equipment/expansion with debt and keep safe liquidity. |
| 7 Jul | Legal forms of business | Choose or change the legal form in response to risk and capital needs. |
| 8 Aug | Stocks and bonds | Build a diversified portfolio, react to market swings. |
| 9 Sep | Financial leverage | Use leverage and survive a market correction. |
| 10 Oct | Dividends | Split profit between paying yourself and reinvesting. |
| 11 Nov | Pre-emptive rights | Use, sell, or let go of the right; understand dilution. |
| 12 Dec | Annual review and strategy | Close the year (net worth, emergency fund, insurance, tax efficiency). Text incomplete. |

## Team research (`ktokiedyidzie.xlsx`)

Three sheets:
- **"wygrałem wiele konkursów"**: startup survival by year of operation. Years 1–10 are data (% still open: 79.6, 69.1, 61.4, 55.4, 50.2, 46.4, 43.6, 40.2, 37.4, 34.7), plus the yearly probability of surviving to the next year and a fitted curve `0.0302·ln(year) + 0.8692` extended to year 75. No source given in the sheet.
- **"analiza rynku"** (market analysis): 15 industries (Gastronomy, Civil Engineering, Investment & Banking, Health and Beauty, Bookkeeping, Manufacturing, Real Estate, PR and Marketing, IT & Software Development, Retail / E-commerce, Law, Energy / Utilities, Maintenance & Repairs, R&D, Agriculture) × 13 cost categories (Salaries, Supplies, Machinery, PR and Marketing, Logistics & Transport, IT & Software Development, Retail / E-commerce, Law, Real Estate / Property, Energy / Utilities, Maintenance & Repairs, R&D, Bookkeeping). Cells are **text descriptions** ("high cost of electricity and water", "close to zero"), **no numbers**. This is the "market model" that month 1 of the curriculum refers to.
- **"Pytania do przedsiębiorcy"**: 4 open questions (business type, number of employees, greatest costs, other businesses you collaborate with).

## Onboarding target design ("Finance Quest" artifact)

**Decided (user, 2026-11-21): our onboarding must look and behave like this artifact:** https://claude.ai/artifact/H28cQRhYMHGqxavfxSNd37 (HTML prototype in Polish, made outside the org; re-read it with the Artifact tool when implementing). It supersedes the earlier survey prototype (plain black/white, placeholder questions, single choice only).

- **Look:** font **Manrope** 400–800. Palette: petrol `#00262D` / `#003A44` / `#004B57` / `#0B5E6B` / `#E2EEEF`, yellow `#FFD400` (CTA), bg `#F2F5F5`, surface `#FFFFFF`, ink `#0D2A30`, muted `#5B7076`, line `#DAE3E4`. The 4 accounts: Konto `#F2C200` (ink `#8A6E00`), Poduszka `#22A088`, Przyszłość `#2C7DA6`, Pakiet `#0B4F5C`. Tiles: radius 16, 1.5 px border, selected = petrol border + filled round/square check mark. Yellow CTA, radius 16, sticky at the bottom. Welcome screens on a dark petrol background with drifting blurred circles.
- **Motion:** springs (stiffness/damping: soft 170/24, snappy 320/26, lively 240/17, bar 140/22), staggered entrances, SVG lines that draw themselves, press = scale .965, haptic tick on every choice.
- **Flow:** HUD (back button, progress bar, "n / total" question counter) → 4 welcome slides (swipeable, SVG art, dots, "skip intro") → age band (5) → who are you (private person / entrepreneur) → industry (entrepreneurs; 6 tiles, 2 columns) → "4-account rule" explainer: stairs Konto → Poduszka → Przyszłość → Pakiet (foundation), revealed one by one with a focus card → "personal finances first, then the company" (entrepreneurs; a house labeled FIRMA lands on the stairs) → questions grouped by account, each group ends with an "X goes into the game" screen → result: profile summary per account + "your horizon" + debug JSON + "Start game".
- **Questions (id → account):** income, endMonth, loans (multi), separate (business), taxReserve (business) → Konto; cushion → Poduszka; saveRate, retire (multi, ages < 65), seniorInvest (65+) → Przyszłość; insSpend, health (18–25, 65+), life (26–65), car, home, bizIns (business) → Pakiet. Some options depend on the age band. The result builds a profile: age band, player type, industry, answers, flags (e.g. `car_oc_only`, `home_uninsured`, `mixed_accounts`, `no_tax_reserve`).

**Decided for the artifact port (2026-11-21):**
- Texts in **English** (translated). Polish financial products keep their names with a short English note (ZUS, IKE, IKZE, PPK, PPE, OIPE, OC/AC, NNW).
- **Both paths stay**: private person and entrepreneur ("we also focus on personal finances").
- Industry screen: **6 tiles**; our 3 playable (Gastronomy, IT & Software, Manufacturing) + Beauty, Retail, Services shown **locked ("soon")**.
- **Multi-select** questions are added (loans, retirement accounts).
- Later, when mapping answers to the starting state: **personal finances scale with the income answer**, the **company stays a fixed industry package**.
- Dependencies (all run in Expo Go): `react-native-svg`, `expo-font` + `@expo-google-fonts/manrope`, `expo-haptics`, `expo-linear-gradient`. Animations use React Native's built-in `Animated` (springs with the artifact's stiffness/damping); no reanimated.
- The debug "profile JSON" on the result screen is shown **only in development** (`__DEV__`).

## DECIDED

### Architecture (from the project brief)
- Monorepo:
  - `apps/mobile`: Expo / React Native + TypeScript
  - `apps/server`: custom Node.js + TypeScript backend
  - `packages/engine`: simulation engine, pure TS, no UI, no I/O
  - `packages/content`: game content in JSON (industries, levels, events, actions, lessons)
  - `packages/shared`: shared types and Zod schemas (API contracts)
- Deterministic engine: state + action → new state. Events drawn from a seed (seeded RNG). Every action goes into a decision log. State snapshot at the start of each month (for replay).
- Content is data, not code: non-technical people fill in a spreadsheet and export it to JSON.
- The server doesn't trust the phone: the phone sends seed + decision log, the server recomputes the result with the same engine.
- Database: PostgreSQL in Docker (Docker Compose) + Prisma. Validation: Zod.
- Realtime (later): Socket.IO.
- Hosting: locally on the laptop. The server listens on `0.0.0.0`. The team connects via Tailscale and tests via Expo Go. API address in the `EXPO_PUBLIC_API_URL` variable.

### Decided in conversation (2026-11-21)
- Project name (working): **Piwco**.
- Package manager / monorepo: **npm workspaces**.
- Engine tests: **Vitest** (choice was open, so the recommendation was taken).
- Git: branch `master`. **Pushed to GitHub on the user's request (2026-11-21): private repo https://github.com/apaczus/piwco** (account `apaczus`, the one logged in with `gh` on the developer laptop), so someone else can clone the project and continue. Commit / push only on explicit request.
- Money in the engine: **integers, whole PLN** (no grosze).
- Engine model:
  - **random events are drawn at the start of the month**, the player reacts with actions. Month 3 (insurance) keeps this rule: an event may hit before the player is insured, the player buys insurance afterwards and **learns from the mistake**;
  - **business and personal money are separate accounts**;
  - actions are **one-off** (repay, buy) **and recurring** (hire, insurance: change monthly costs/revenue);
  - **each level has its own goal logic in code** (in `packages/engine`), not a generic condition list;
  - **owner's draw** action: transfer money from the business account to the personal account.
- Curriculum in the MVP: **months 1–3 playable**, months 4–12 **visible but not clickable** (locked).
- Lesson-card texts: **Claude writes them in English**, the team reviews.
- Month 1 budget: a **separate budgeting screen** where the player splits money into categories.
  - Business categories: only the cost categories that matter for the player's industry (skip "none" / "close to zero" in the market analysis), **max ~6**.
  - Household categories (Claude's proposal, accepted): housing, food, car & transport, insurance, savings, other.
  - Mechanics (month 1): business costs are fixed (from the industry). The player decides **how much to pay themselves** (owner's draw) and **splits that amount into household categories**. Housing and food have a **minimum**; spending less creates arrears. The "savings" category feeds the emergency fund.
  - **Month 1 goal:** both accounts ≥ 0 at the end of the month and no arrears.
- Month-end settlement (decided for step 11):
  - **balances never go below 0**: whatever can't be paid becomes **arrears**;
  - the household budget is an action **"set budget"** that the player can change until "End month"; the last version counts; every change goes to the log;
  - business revenue arrives **in full at the month-end settlement** (a "client pays late" event can later move part of it to the next month); unspent personal money stays on the personal account.
- Game state fields (months 1–3):
  - **business:** industry, cash, monthly revenue, monthly costs per industry budget category, employees, policies (liability, property, equipment), arrears;
  - **personal:** cash, emergency fund (separate amount), monthly household spending per category, debt (balance + installment), owns house / owns car, policies (health, life, loss of income), arrears;
  - **technical:** month number, RNG state, decision log.
- Onboarding, open sheet questions turned into closed ones:
  - "What is your biggest cost?" → single choice from the player's industry cost categories; the chosen category starts higher (e.g. +20%).
  - "Do you work with other businesses?" → no / a few / many; more collaboration → higher chance of a "client pays late" event.
  - Personal-finance questions: keep the prototype's placeholder questions until the team provides its own.
- Game screen, month 1 (decided 2026-11-21):
  - order: **game screen first** (industry from the onboarding + default household numbers), mapping onboarding answers to numbers comes after;
  - **month 1 goal: no new arrears after settlement**, neither in the company nor at home;
  - amounts are entered with a **big number + −500 / −100 / +100 / +500 buttons** (no keyboard);
  - layout per the brief: **HUD with company + home numbers top right, collapsible action bar on the left**, in the onboarding's petrol/yellow style;
  - month start: a card "Month 1 · January: Budget and cash flow" with the challenge from `levels.json`, then the game screen;
  - after "End month": success → **lesson card** from `levels.json`, then "February coming soon"; failure → **"what went wrong"** built from the month report + **"Replay the month"** from the month-start snapshot.
- "Dopamine" game start (user: after the survey show "welcome to the game, your first task is…", challenge visible, clear UI; Claude's recommendations accepted 2026-11-21):
  - **"Welcome to the game" screen** right after the onboarding (or "Skip to game"): petrol background, confetti, industry badge, starter pack counting up, "YOUR FIRST MISSION" card, "Accept mission";
  - the month's **mission = 3 steps pinned at the top of the game screen**, ticked off with an animation + haptic; tapping an open step opens its action; "End month" pulses at 3/3;
  - **no points / XP for now** (add them together with the leaderboard); the reward shown is what really unlocks (February + lesson);
  - the forecast moved into the HUD (two cards: Company / Home, "month end ✓/✗"); action bar collapsed by default, with short labels;
  - confetti written by hand (no library);
  - mission texts live in `levels.json` (`mission: { title, steps[{id,label}], reward }`); which step is done is decided in code.
- Playable industries: **Gastronomy, IT & Software Development, Manufacturing**.
- PLN amounts for industries: **Claude proposes them** from the market-analysis descriptions, the team reviews.
- Startup survival data: used as a **hook on the start screen** ("1 in 5 businesses closes in its first year") **and in the summary**, NOT as a bankruptcy probability in the engine.
- The **"Pytania do przedsiębiorcy" sheet = the in-game onboarding questions** that set the player's starting point.
- The same seed **does not have to** produce the same events if the player makes different decisions.
- Team phones: **3 × Android, 3 × iOS**, all testing via Expo Go. Tailscale app installed on the phones.
- Phones reach the laptop via **Tailscale machine sharing** (laptop → Share): every teammate keeps their own Tailscale account and sees only the laptop.
- Backend: **Fastify** (5.x). Dev: `tsx watch` (runs TS without a build). Types: TypeScript 7, `tsc --noEmit`.
- Package prefix: **`@piwco/*`** (e.g. `@piwco/server`).
- Shared TS settings in `tsconfig.base.json` (strict). `module`/`moduleResolution` are set per package (server: NodeNext, mobile will differ).
- **Postgres + Prisma right away** in the backend skeleton (not later).
- Postgres: **`postgres:18`** in root `docker-compose.yml`, host port **`127.0.0.1:5433`** (5432 is taken by another project's container `peer_support_db` — don't touch it). Dev credentials: user `piwco`, password `piwco`, database `piwco`. Data in Docker volume `piwco-pgdata`.
  - Connection URL: `postgresql://piwco:piwco@localhost:5433/piwco`
  - Start: `docker compose up -d --wait` (from the project folder). No restart policy, so after a laptop reboot it must be started again.
- Language: **everything in English** (code, in-game texts, CLAUDE.md). Chat with the user stays in Polish.
- **Changed work order:** first a working backend (Fastify + Postgres + Prisma) and the team connecting from phones to the local server, then the engine and the game.
  - Update: Prisma is **paused** (Postgres is running). Onboarding survey prototype came first; Prisma comes back when there is something to save.
- Mobile: **Expo SDK 58** (React Native 0.88, React 19.3), **Expo Router**, routes in `apps/mobile/src/app/`. TypeScript in mobile is the version Expo expects (6.0); the server uses TS 7.
- Onboarding survey (**superseded by the "Finance Quest" artifact design above**; open conflicts are listed under UNDECIDED):
  - **one question per screen**, big buttons, progress bar, back button, summary at the end;
  - question types: **`yes_no` and `single_choice` only** (the artifact also has multi-select);
  - questions live in `packages/content/src/onboarding.json` (content as data);
  - answers kept **only in app memory** (React state, no library) for now.
- MVP: **2–3 playable industries**.
- **MVP scope for 24 h:**
  - onboarding (5–8 questions) → 3 levels → HUD, actions, events, end of month, lesson card, simple city;
  - server recomputes the result, leaderboard by nickname (**no passwords**);
  - **cut:** friends, challenges, Socket.IO;
  - AI roast only if time is left at the end.
- Time: as of 2026-11-21, **~24 h** left until the end of the hackathon.

## UNDECIDED (ask before it's needed)

- Confirm: internal packages consumed directly from `.ts` sources, no build (used as an ASSUMPTION in the prototype: `@piwco/content` has `"main": "src/index.ts"`).
- Real onboarding questions (the team has them; the prototype uses placeholder questions and placeholder industries).
- Which 2–3 industries are playable.
- Language the team writes content in (in-game texts must end up in English).
- Validating content JSON (e.g. with Zod); right now it's only a TypeScript cast.
- Game state library (survey uses plain React state), how to draw the city, UI style (prototype uses a neutral black/white look).
- Exact game state fields (proposal pending) and how onboarding maps to the starting state.
- Concrete PLN numbers for the 3 industries and the levels (Claude proposes, team reviews).
- Source of the startup survival data (needed before showing it to the jury).
- What a "private person" (no company) actually plays in the game.
- Brand name shown in the app: the artifact says "FINANCE QUEST", the working project name is "Piwco".
- Exact effect of each onboarding answer on the starting state (numbers).
- Real personal-finance onboarding questions (the team's sheet has none yet).
- Auth details (decided only: nickname, no passwords).
- Anything else not listed under DECIDED.

## Environment (developer laptop, as of 2026-11-21)

- Ubuntu 24.04, x86_64
- Node 24.14.1, npm 11.11.0 (pnpm / yarn / bun: not installed)
- git 2.43
- Docker 29.1.3 + Compose 2.40.3. Works without sudo (user is in the `docker` group).
- Tailscale 1.104.7 on the laptop, address **`100.100.123.81`**. Firewall (ufw) disabled.

## Technical notes and risks

- Expo Go over Tailscale: the phone must reach **Metro (port 8081)**, where it downloads the app code, and the **API**. Metro has to be exposed on the laptop's Tailscale address. Every phone needs the Tailscale app.
- Expo Go from the stores supports only the latest Expo SDK and no custom native modules. This limits library choices (e.g. for drawing the city).
- In `apps/mobile`, add packages with `npx expo install <pkg>` (run inside `apps/mobile`): it picks versions compatible with the SDK. Don't run `npm audit fix --force` there.
- Metro is started with `REACT_NATIVE_PACKAGER_HOSTNAME=$(tailscale ip -4)`, so the QR code points phones at the laptop's Tailscale address.
- The Expo template's extra files (`AGENTS.md`, `.claude/settings.json`, `LICENSE`) were removed on purpose.
- Engine and content versions must be identical on the phone and the server, otherwise the recomputation won't match. Proposal: store these versions in the decision log.

## Progress

- [x] Step 1: CLAUDE.md
- [x] Step 2: `git init`, `.gitignore`, root `package.json` (npm workspaces: `apps/*`, `packages/*`, Node >= 24)
- [x] Step 3: `apps/server`, Fastify with `GET /health` → `{"ok":true}` on `0.0.0.0:3000`. Run: `npm run dev -w @piwco/server` (from the project folder).
- [x] Step 4: Tailscale on the laptop, laptop shared with the team. First phone (`100.71.49.74`) opened `http://100.100.123.81:3000/health` → 200 `{"ok":true}`. Remaining phones use the same procedure (check the server log for their `100.x` addresses).
  - Note: shared devices are one-way. Phones see the laptop, but `tailscale status` on the laptop does not list the phones. Check connections in the server log instead.
- [x] Step 5: Postgres 18 in Docker Compose, healthy, port `127.0.0.1:5433` only, data survives a container restart.
- [x] Step 6: survey prototype. `apps/mobile` (Expo + Router): Welcome → Onboarding (one question per screen) → Summary. `packages/content` with 7 placeholder questions. Type-check OK, Android + iOS bundles build, Metro reachable at `exp://100.100.123.81:8081`.
  - Run: `npm run start:tailscale -w @piwco/mobile` (from the project folder), scan the QR code with Expo Go.
  - Tested on a phone by the user: looks OK.
- [x] Step 7: curriculum as data, `packages/content/src/levels.json` (12 months translated to English, 1–3 `playable`, lesson cards for 1–3 written by Claude, waiting for team review). Exported as `levels` from `@piwco/content`, typed as `Level[]` without a cast, so TypeScript checks the JSON shape. Month 3 challenge text adapted to the "learn from the mistake" decision; month 12 challenge shortened (source text incomplete).
- [x] Step 8: engine skeleton. `packages/engine` (`@piwco/engine`, `moduleResolution: Bundler`, Vitest 5, TS 7). Seeded RNG in `src/rng.ts`: **mulberry32**, pure functions (`createRng`, `nextFloat`, `nextInt`). The RNG state is one uint32 number that is passed in and returned, so it can live in the game state / month snapshot. 8 tests (determinism, matches reference mulberry32, purity, ranges). Run: `npm test -w @piwco/engine`.
  - Risk: the server uses NodeNext. When it imports the engine (extensionless imports), its `moduleResolution` may need to change to `Bundler`.
- [x] Step 9: game state + first actions in `packages/engine/src`:
  - `state.ts`: `GameState` (business, personal, month, rng, log), `Action` union, `ActionResult`;
  - `initialState.ts`: `createInitialState(setup)`; the engine holds **no amounts**, numbers come from outside; arrears start at 0; nested objects are copied;
  - `actions.ts`: `applyAction(state, action)` → `{ ok: true, state } | { ok: false, error }` (never throws, never mutates). Actions: `owner_draw` (business → personal), `transfer_to_emergency_fund` (personal → fund). Amount must be a positive integer and ≤ the source balance. Successful actions are appended to `state.log` with the month; unknown action types are rejected;
  - `testFixtures.ts`: temporary placeholder numbers + `deepFreeze` (tests only). 28 tests total.
- [x] Step 10: first draft of the numbers (Claude's proposal, **waiting for team review**):
  - `packages/content/src/industries.json`: Gastronomy (revenue 70 000, costs 64 500, cash 5 000, 5 employees), IT & Software (90 000 / 72 300 / 20 000 / 4), Manufacturing (120 000 / 115 000 / 30 000 / 8); 6 cost categories each;
  - `packages/content/src/household.json`: cash 1 500, spending housing 2 500 (min 2 500), food 1 500 (min 1 000), car & transport 700, insurance 0, savings 0, other 500; owns house + car, no debt;
  - exported as `industries`, `household` (typed, no cast);
  - engine: `buildInitialSetup(industry, household, seed)` in `setupFromContent.ts` (content → `InitialSetup`, throws on broken content). Engine now depends on `@piwco/content` and has `resolveJsonModule`. 38 tests.
  - Onboarding answers do not change the starting state yet. The prototype survey still lists placeholder industries (Food service / Retail / IT services), to be replaced by the 3 real ones.
- [x] Step 11: onboarding ported from the "Finance Quest" artifact (English), replacing the survey prototype:
  - content: `packages/content/src/onboarding.json` (welcome slides, age bands, horizons, 6 industries with `playable`, 4 accounts, 15 questions with age/business filters, multi-select, age-specific options) exported as `onboarding` (cast to `OnboardingContent`);
  - mobile: `src/theme.ts` (tokens, springs, `mix()`), Manrope loaded in `_layout.tsx`, `src/app/index.tsx` renders `OnboardingFlow`; `src/onboarding/`: `flow.ts` (pure logic: `flowFor`, `questionsFor`, `progressOf`, `buildProfile`), `anim.tsx` (Enter, PressScale, DrawPath, PopG, haptics), `ui.tsx` (tiles, CTA, panels), `Stairs.tsx` (4-account stairs, arrows, company house, focus cards), `WelcomeArt.tsx`, `Hud.tsx` (+ welcome background), `screens.tsx`, `OnboardingFlow.tsx`;
  - checked: typecheck, flow simulation for 3 player types (screens, age-specific questions, counter, profile flags), Android + iOS bundles build and are served over Tailscale.
  - Known differences from the artifact: blurred background circles are soft radial gradients; SVG "pop" and bar growth are fades (no per-shape scale); the old focus card is not faded out before the new one; dashed ghost borders may render differently on Android; the company house's space above the stairs is reserved from the start (the stairs don't get pushed down). "Start game" only changes the button text (same as the artifact). No web build (pressing `w` in Metro fails).
  - Smoothness fix (user reported stutter, "as if refreshing"): the screen container was made visible again right after `setState`, before the new screen rendered, so the old screen flashed back for a moment; now it is reset in `useLayoutEffect` after the new screen mounts. Progress bar, petrol background and screen exit run on the native driver; the company house no longer changes layout every frame; blocks no longer re-render on layout; mount springs never restart. Only SVG line drawing / SVG fades stay JS-driven (SVG props can't use the native driver). **Confirmed smooth on phones by the user.**
- **Metro mode:**
  - **while developing/testing: dev mode** `npm run start:tailscale -w @piwco/mobile -- --clear`. Expo Go always downloads the code from the laptop and changes arrive by themselves (Fast Refresh).
  - **production mode** (`-- --no-dev --minify`) is smoother, but Expo Go **kept launching a cached old bundle** after code changes (no bundle request from the phones ever reached Metro, even after fully closing Expo Go and after a reload command). Use it only for the final demo, after the last code change, and check in the Metro log that every phone downloaded the bundle ("Android/iOS Bundled" lines).
- [x] Step 12: month-end settlement in the engine:
  - action `set_household_budget` (exactly the 6 categories, whole PLN ≥ 0, changeable until settlement, logged);
  - `personal.minimumSpending` stored in the state at game start (from `household.json` minimums);
  - `settleMonth(state)` in `settle.ts` → `{ state, report }`. Business: revenue in → old arrears → costs. Personal: old arrears → loan installment → bills in order housing, food, car & transport, insurance, other → savings into the emergency fund from what is left. Unpaid amounts and budgets below minimum become arrears; balances never go below 0. Loan: balance drops by the paid installment (no interest in the MVP), last installment capped at the balance, paid-off loan → installment 0. Does not check the goal or change the month;
  - `MonthReport`: revenue, costs, what was paid, arrears added, per-bill lines (budgeted / paid / unpaid / below minimum), saved to fund, end balances. Base for the "what went wrong" screen;
  - 55 engine tests.
  - Note: since balances can't go below 0, the month 1 goal "no negative balance" effectively means **no new arrears**.
- [x] Step 13: playable January on the phone:
  - engine `levels.ts`: `checkMonthGoal(month, report)` → `{ passed, reasons }`; month 1 = no new arrears; reasons: `costs_unpaid`, `installment_unpaid`, `bill_unpaid`, `below_minimum`; other months throw "No goal logic yet". 61 engine tests;
  - mobile: route `/game?industry=…` (`src/app/game.tsx`); `src/game/`: `session.ts` (pure: `newSession`, `act`, `endMonth`, `replay`), `GameFlow.tsx` (phases intro → play → draw/budget → result → roadmap, same smooth transition as the onboarding), `MonthIntro`, `GameScreen` (eyebrow, `ActionBar` left + `GameHud` right, "what's left at the end of the month" forecast computed with `settleMonth`, challenge, End month), `DrawSheet` (Pay yourself, live preview), `BudgetScreen` (6 categories, minimums, left/missing), `MonthResult` (lesson card / what went wrong + tips + replay) and `Roadmap` (12 months: done / soon / locked), `AmountStepper`, `format.ts`;
  - onboarding "Start game" → `/game` for entrepreneurs with a playable industry; private persons see "coming soon";
  - month 1 actions: Pay yourself, Household budget; "Save to cushion" (Feb) and "Insurance" (Mar) are shown locked;
  - checked: typecheck, session simulation for all 3 industries, bundles served by Metro.
  - **Finding:** with the current numbers the company can't fail in month 1 (the draw is capped at the cash on the account and the month's revenue always covers costs). The only way to fail is paying yourself too little or budgeting below the minimum. Pass ranges for the owner's draw: Gastronomy 3 700–10 500 (capped at 5 000 cash), IT 3 700–37 700, Manufacturing 3 700–35 000.
- [x] Step 13b (user: "can't start the game" + asked for a skip button):
  - cause: the phones were still running the previous bundle (no "Bundled" request from a phone in the Metro log after the change). In production mode there is no hot reload: **Expo Go must be fully closed and reopened** to get a new version;
  - **TEMPORARY** "Skip to game ›" button (dashed border, top right of every onboarding screen) → `/game?industry=gastronomy`. Controlled by `apps/mobile/src/devFlags.ts` (`DEV_SKIP_TO_GAME`, `DEV_SKIP_INDUSTRY`). **Turn off before the final demo.** It also works as a "new version loaded" indicator;
  - routes `index.tsx` and `game.tsx` export Expo Router's `ErrorBoundary`, so a crash shows the error on the phone;
  - "Start game": private persons get "The game is for entrepreneurs for now: private persons coming soon"; a navigation error is shown on the button.
- [x] Step 14: "dopamine" game start:
  - content: month 1 `mission` in `levels.json` + `Mission` type;
  - mobile `src/game/`: `mission.ts` (pure: step done? `pay_yourself` = owner draw this month, `plan_budget` = budget set this month, `all_paid` = the month goal would pass now), `Confetti.tsx` (native-driver burst), `WelcomeToGame.tsx`, `MissionCard.tsx` (progress bar, ticks, celebrates steps done since the last visit; GameFlow keeps the celebrated set and resets it on replay / new game), `GameHud.tsx` rewritten (Company / Home cards with month-end forecast), `GameScreen.tsx` (eyebrow → mission → action bar + HUD; long forecast and challenge panels removed; pulsing "End month ✓"), `ActionBar` rail labels, `MonthResult` success: "MISSION COMPLETE!" badge + confetti + success haptic; `session.ts`: new games start in phase `welcome`; `buzz("success")`;
  - checked: typecheck, 61 engine tests, mission simulation (0/3 → draw → bills covered → budget 3/3, below-minimum unticks, replay resets), bundles built by Metro (dev mode).
- [ ] Next (proposal): → month flow → month 1 logic + budget screen → game screen (HUD, action bar) → months 2–3 → city → server recomputation + leaderboard. Onboarding questions from the "Pytania do przedsiębiorcy" sheet get swapped in.
