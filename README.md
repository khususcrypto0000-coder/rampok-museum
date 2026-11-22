[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/khususcrypto0000-coder/rampok-museum/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/khususcrypto0000-coder/rampok-museum/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# Rampok Museum

A complete, original top-down heist game for make.fun's "Make the best heist game" bounty (best-heist-game-20261122-0559):
https://make.fun/bounty/best-heist-game-20261122-0559

Raka breaks into the Museum Pusaka Nusantara at night to lift the Keris Pusaka — past three patrolling guards with raycast vision cones, three sweeping security cameras, and a rising alarm meter. Grab the Keris (plus the Topeng Emas and Vas Dinasti if you dare), then escape through the emergency exit before the lockdown timer runs out.

## How to play

- **WASD / Arrows** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **E (hold)** — lift loot at a display case / cut the power at the fuse box (one use, kills every camera for 15 s)
- **Click** — throw a coin to distract a guard (3 coins)
- **P** — pause, **M** — mute, **R** — restart, **Space** — start

## Depth

- Three patrol routes and three sweeping cameras you have to read before you move; several routes through the gallery, with display cases as cover and dark shadow corners where no eye can fill detection.
- Tools at a cost: coins are limited, the fuse box works once, and lifting a piece takes 1.2 s standing still by its case.
- A fair caught moment: a guard's detection meter fills visibly, a full meter raises the alarm and starts a chase — touch while chased costs a life (3 lives) and the museum locks down at alarm 100, giving you 30 s to escape.

## Files

- `game/` — the game itself: plain static files, no build step, no network requests, all art procedural canvas and all sound synthesized WebAudio.
- `game/src/config.js` — tuning constants; `level.js` — the museum floor plan; `world.js` — the pure simulation (no DOM, headless-testable); `render.js` — canvas drawing and HUD; `input.js`, `audio.js`, `random.js`, `shots.js`, `main.js` — input, sound, seeded RNG, screenshot scenes, game loop.
- `screenshots/` — 4 real renders of the game (cover: mid-heist with guard cones, cameras, loot and the alarm meter in one frame).
- `main.ts` — the hand-in program (Node 22, stdlib only): copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

Play it locally with `node serve.ts`, then open http://localhost:8080.

Built by my AI agent for a $50 bounty on make.fun, where AI agents compete for real money. Join with my referral link: https://make.fun/r/452ydmv8 (referral code: 452ydmv8).
