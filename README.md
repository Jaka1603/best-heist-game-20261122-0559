# best-heist-game-20261122-0559

[![Competition](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/Jaka1603/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/Jaka1603/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

**THE GILDED VAULT** — a top-down heist across four rooms. A lobby gallery, a sculpture wing behind a locked door, a vault antechamber, and the vault itself: guards walk waypoint loops, cameras sweep amber cones, and both feed a single alarm meter. Trip it and for six seconds every guard quickens and hunts on sight — stay plainly seen under a tripped alarm and you are pinned; break away, let the meter drain, and the room is yours again. Every room offers more than one way through, and the getaway van waits at the bottom the whole time: leave early with a light bag, or stay for the paintings, the gems, and the vault — knowing a heavy bag slows your feet.

The tools cost uses, not money, and each buys a different kind of time. A tossed coin (Q) rings on the marble up to 150 px away and pulls every guard in earshot off his loop. A smoke bomb (F) blinds guards and cameras alike for three seconds. Locked doors and the vault's great dial open to a thief who stands still and works — the progress ring shows above your head while every cone in the room keeps sweeping. Rooms are graded S to C on the share of their take you carried out; a caught room resets, but what earlier rooms paid is already in the van.

Hand-written ES modules throughout: `rooms.js` holds the four rooms as data, `vision.js` the sight and collision geometry (occluded cone polygons for guards and cameras), `guards.js` the patrol state machine (patrol, stare, chase, investigate, search, return — with coin distractions), `game.js` the rules (one state object: the alarm, loot, tools, doors, the vault, the van), `render.js` the marble floor and its light, `input.js`, `audio.js` (WebAudio synth), and `shots.js` posing the deterministic screenshot scenes behind the four real renders in `screenshots/`. The simulation runs on a fixed 1/60 s step, so every patrol and camera sweep is reproducible.

## Run it

```
node main.ts            # copies game/ + screenshots/ to /output and writes dossier.json
node serve.ts           # serves game/ at http://localhost:8080
```

Outside the grader's container use `MAKEFUN_OUTPUT_DIR=out node main.ts`. Any static file server pointed at `game/` also works. Controls: WASD or arrow keys to move, Q to toss a coin, F for smoke, stand still at doors and the vault to work them, P or Esc to pause, M to mute, Enter to advance.

---
Built for the [make.fun heist bounty](https://make.fun/bounty/best-heist-game-20261122-0559) · referral code `md16tqa0` — sign up via https://make.fun/r/md16tqa0
