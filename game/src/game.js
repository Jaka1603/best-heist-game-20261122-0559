// THE GILDED VAULT — the rules.
// One state object holds the whole heist: the thief, the guards, the
// cameras, the alarm, the loot and the tools. A tick runs in phases —
// age the tools, move the thief, work a door or the vault, let the
// cameras and guards watch, move the alarm meter, gather loot, and
// finally check the van — each phase in its own helper below.
//
// The alarm is a single meter. A guard's stare fills it faster the
// closer he stands; a camera's stare fills it steadily; out of every
// sight it drains away. Fill it and the alarm TRIPS for six seconds —
// every guard quickens and hunts on sight — and a thief still plainly
// seen a breath into the trip is pinned and caught. A chasing guard's
// hands catch the thief at any meter. Loot is lifted by walking up to
// it, and a heavy bag drags the thief's feet. Tools cost uses, not
// money: a tossed coin pulls guards to its ring, a smoke bomb blinds
// every eye for three seconds, and locked doors and the vault itself
// open to a thief who stands still and works — seen, still, worth it.

import {
  ALARM, CAMERA, FIELD, GUARD, HUD_H, PLAYER, TOOLS,
} from './config.js';
import { ROOMS } from './rooms.js';
import { createGuard, MODE_CHASE, updateGuard } from './guards.js';
import {
  canSeeFrom, moveCircle, pointInBlocker,
} from './vision.js';

// Screens the game can be on.
export const SCREEN_TITLE = 'title', SCREEN_PLAY = 'play', SCREEN_CLEAR = 'clear',
  SCREEN_CAUGHT = 'caught', SCREEN_VICTORY = 'victory', SCREEN_PAUSED = 'paused';

// Event bits a tick can report, so the shell can play sounds.
export const EVENT_SEEN = 1 << 0, EVENT_CAUGHT = 1 << 1, EVENT_GETAWAY = 1 << 2,
  EVENT_LOOT = 1 << 3, EVENT_COIN = 1 << 4, EVENT_SMOKE = 1 << 5,
  EVENT_DOOR = 1 << 6, EVENT_VAULT = 1 << 7, EVENT_TRIP = 1 << 8;

// The floor the thief may walk: inside the walls, below the HUD.
const BOUNDS = {
  x: 8, y: HUD_H + 6,
  w: FIELD.width - 16, h: FIELD.height - HUD_H - 14,
};

// A room's grade, from the share of its take carried out.
const GRADE_STEPS = [[0.9, 'S'], [0.7, 'A'], [0.45, 'B']];
export function gradeFor(frac) {
  for (const [cut, grade] of GRADE_STEPS) if (frac >= cut) return grade;
  return 'C';
}

export function createGame() {
  // The whole heist in one object, grouped by what each part is for.
  const state = {
    // Where the game is, and which room.
    screen: SCREEN_TITLE, roomIndex: 0, room: ROOMS[0],
    // The thief.
    player: { x: 0, y: 0, dir: -Math.PI / 2, moving: false },
    // The room's eyes.
    guards: [], cameras: [],
    // The alarm.
    alarm: 0, alarmT: 0, pinT: 0, seenNow: false, seenByCamera: false,
    // The take.
    loot: [], lootTaken: 0, lootTotal: 0, bag: 0,
    // The tools.
    coins: TOOLS.coins, smokesLeft: TOOLS.smokes, coin: null, smokeClouds: [],
    // Doors and the vault.
    doors: [], vault: null, vaultCracked: false, vaultProgress: 0, work: null,
    // Ephemera, totals, and the line the player is told.
    ripples: [], time: 0, elapsed: 0, totalLoot: 0, grades: [], roomGrade: '',
    message: '', messageTime: 0, caughtBy: '', input: { x: 0, y: 0 },
  };

  // Furniture, shut doors and the vault block, as one list.
  function solidsNow() {
    const shut = state.doors.filter((d) => !d.open).map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, kind: 'door' }));
    const vault = state.room.vault ? [{ x: state.room.vault.x, y: state.room.vault.y, w: state.room.vault.w, h: state.room.vault.h, kind: 'vault' }] : [];
    return state.room.blockers.concat(shut, vault);
  }

  // What an eye must look through: the solids, plus live smoke.
  function sightNow(solids) {
    const smoke = state.smokeClouds.map((s) => ({ x: s.x, y: s.y, r: s.r, kind: 'smoke' }));
    return solids.concat(smoke);
  }

  function startRoom(index) {
    const room = ROOMS[index];
    state.roomIndex = index;
    state.room = room;
    const p = state.player;
    p.x = room.playerStart.x;
    p.y = room.playerStart.y;
    p.dir = -Math.PI / 2;
    p.moving = false;
    state.guards = [];
    for (const def of room.guards) state.guards.push(createGuard(def));
    state.cameras = [];
    for (const c of room.cameras) state.cameras.push({ ...c, dir: c.baseDir, sees: false });
    state.loot = [];
    for (const l of room.loot) state.loot.push({ ...l, taken: false });
    state.doors = [];
    for (const d of room.doors) state.doors.push({ ...d, open: false, progress: 0 });
    let total = 0;
    for (const l of room.loot) total += l.value;
    if (room.vault) total += room.vault.value;
    state.lootTotal = total;
    // Everything else back to the start of a room.
    Object.assign(state, {
      alarm: 0, alarmT: 0, pinT: 0, seenNow: false, seenByCamera: false,
      lootTaken: 0, bag: 0, coins: TOOLS.coins, smokesLeft: TOOLS.smokes,
      coin: null, smokeClouds: [], vault: room.vault, vaultCracked: false,
      vaultProgress: 0, work: null, ripples: [], time: 0,
      message: room.name, messageTime: 2.2, screen: SCREEN_PLAY,
    });
  }

  function startCampaign() {
    state.totalLoot = 0;
    state.grades = [];
    state.elapsed = 0;
    startRoom(0);
  }

  function caught(reason) {
    state.screen = SCREEN_CAUGHT;
    state.caughtBy = reason;
    return EVENT_CAUGHT;
  }

  function getaway() {
    const frac = state.lootTotal > 0 ? state.lootTaken / state.lootTotal : 0;
    state.roomGrade = gradeFor(frac);
    state.grades.push(state.roomGrade);
    state.totalLoot += state.lootTaken;
    state.screen = SCREEN_CLEAR;
    return EVENT_GETAWAY;
  }

  // Q: throw a coin where the thief faces. It rings on the marble and
  // every guard in earshot goes to look at the ring.
  function tossCoin() {
    if (state.screen !== SCREEN_PLAY || state.coins <= 0) return 0;
    state.coins -= 1;
    const p = state.player;
    const ux = Math.cos(p.dir);
    const uy = Math.sin(p.dir);
    let lx = p.x + ux * TOOLS.coinRange;
    let ly = p.y + uy * TOOLS.coinRange;
    const solids = solidsNow();
    // A coin that would land inside furniture stops at its edge instead.
    let nudges = 0;
    while (pointInBlocker(lx, ly, solids) && nudges < 24) {
      lx -= ux * 8;
      ly -= uy * 8;
      nudges += 1;
    }
    lx = Math.max(20, Math.min(FIELD.width - 20, lx));
    ly = Math.max(BOUNDS.y + 12, Math.min(FIELD.height - 12, ly));
    state.coin = { x: lx, y: ly, t: 2.5 };
    state.message = 'The coin rings on the marble…';
    state.messageTime = 1.4;
    return EVENT_COIN;
  }

  // F: drop a smoke bomb at the thief's feet. Three seconds of blindness
  // for every eye in the room.
  function dropSmoke() {
    if (state.screen !== SCREEN_PLAY || state.smokesLeft <= 0) return 0;
    state.smokesLeft -= 1;
    state.smokeClouds.push({ x: state.player.x, y: state.player.y, r: TOOLS.smokeRadius, age: 0 });
    state.message = 'Smoke — every eye is blind.';
    state.messageTime = 1.4;
    return EVENT_SMOKE;
  }

  // --- tick phases -------------------------------------------------------

  function ageTools(dt) {
    if (state.coin) {
      state.coin.t -= dt;
      if (state.coin.t <= 0) state.coin = null;
    }
    for (const s of state.smokeClouds) s.age += dt;
    state.smokeClouds = state.smokeClouds.filter((s) => s.age < TOOLS.smokeSeconds);
  }

  // The thief walks; a heavy bag drags. Diagonal input is normalised so
  // a diagonal step is no faster than a straight one.
  function moveThief(dt, solids) {
    const p = state.player;
    const drag = Math.min(PLAYER.bagSlowMax, Math.max(0, state.bag - 2) * PLAYER.bagSlowPerItem);
    const speed = PLAYER.speed * (1 - drag);
    const mag = Math.hypot(state.input.x, state.input.y);
    p.moving = mag > 0.01;
    if (!p.moving) return;
    const nx = state.input.x / (mag > 1 ? mag : 1);
    const ny = state.input.y / (mag > 1 ? mag : 1);
    p.dir = Math.atan2(ny, nx);
    moveCircle(p, nx * speed * dt, ny * speed * dt, solids, BOUNDS, PLAYER.radius);
  }

  // Work: standing still at a door or at the vault's face makes progress.
  // Moving, or standing anywhere else, earns nothing. Returns event bits.
  function doWork(dt) {
    let events = 0;
    const p = state.player;
    state.work = null;
    if (p.moving) return events;
    for (const d of state.doors) {
      if (d.open) continue;
      const near = p.x >= d.x - 30 && p.x <= d.x + d.w + 30 && p.y >= d.y - 30 && p.y <= d.y + d.h + 30;
      if (near) {
        d.progress += dt;
        state.work = { label: 'Picking the lock…', frac: d.progress / PLAYER.doorSeconds };
        if (d.progress >= PLAYER.doorSeconds) {
          d.open = true;
          state.message = 'The lock clicks open.';
          state.messageTime = 1.5;
          events |= EVENT_DOOR;
        }
      } else {
        d.progress = 0;
      }
    }
    const v = state.room.vault;
    if (v && !state.vaultCracked) {
      const inRing = p.x >= v.x - 6 && p.x <= v.x + v.w + 6 && p.y >= v.y + v.h - 2 && p.y <= v.y + v.h + 42;
      if (inRing) {
        state.vaultProgress += dt;
        state.work = { label: 'Cracking the vault…', frac: state.vaultProgress / PLAYER.vaultSeconds };
        if (state.vaultProgress >= PLAYER.vaultSeconds) {
          state.vaultCracked = true;
          state.lootTaken += v.value;
          state.bag += 3;
          state.message = `The vault swings open — $${v.value.toLocaleString('en-US')}!`;
          state.messageTime = 2.2;
          events |= EVENT_VAULT;
        }
      } else {
        state.vaultProgress = 0;
      }
    }
    return events;
  }

  // The cameras sweep, and watch. Returns true when any camera sees the thief.
  function watchCameras(sight) {
    const p = state.player;
    let any = false;
    for (const c of state.cameras) {
      c.dir = c.baseDir + Math.sin(state.elapsed * c.speed + c.phase) * c.sweep;
      const d = canSeeFrom(c.x, c.y, c.dir, p.x, p.y, sight, CAMERA.range, CAMERA.halfAngle);
      c.sees = d >= 0;
      if (c.sees) any = true;
    }
    state.seenByCamera = any;
    return any;
  }

  // The guards: each one watches, thinks, and moves. Returns what the
  // tick needs: { events, seen, nearest, done }, where done means a
  // catch already ended the tick.
  function runGuards(dt, sight) {
    const p = state.player;
    let events = 0;
    let seen = false;
    let nearest = Infinity;
    for (const g of state.guards) {
      let distraction = null;
      if (state.coin) {
        const d = Math.hypot(g.x - state.coin.x, g.y - state.coin.y);
        if (d <= TOOLS.coinHearRadius) distraction = state.coin;
      }
      const steps = updateGuard(g, dt, {
        player: p, blockers: sight, bounds: BOUNDS,
        meter: state.alarm, alarmTripped: state.alarmT > 0, distraction,
      });
      for (const s of steps) {
        if (s === 'ripple') state.ripples.push({ x: g.x, y: g.y, age: 0, life: 1.1, kind: 'guard' });
      }
      if (!g.seesPlayer) continue;
      seen = true;
      if (g.seeDist < nearest) nearest = g.seeDist;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d <= GUARD.catchDistance && (g.mode === MODE_CHASE || state.alarmT > 0)) {
        events |= caught('run down by a guard');
        return { events, seen, nearest, done: true };
      }
    }
    return { events, seen, nearest, done: false };
  }

  // The alarm meter: sight fills it, darkness drains it. Returns
  // { events, done }, where done means the pin caught the thief.
  function updateAlarm(dt, seen, guardSee, nearestSee, camSee) {
    let events = 0;
    if (seen && !state.seenNow) events |= EVENT_SEEN;
    state.seenNow = seen;
    if (seen) {
      const fromGuard = guardSee ? ALARM.guardFillBase * Math.max(0, 1.15 - nearestSee / GUARD.visionRange) : 0;
      const fromCam = camSee ? CAMERA.fillPerSecond : 0;
      const fill = Math.min(fromGuard + fromCam, 1.7);
      state.alarm = Math.min(1, state.alarm + fill * dt);
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
    }
    if (state.alarmT > 0) {
      state.alarmT -= dt;
      if (state.alarmT <= 0) state.alarm = 0.55;
    } else if (state.alarm >= 1) {
      state.alarmT = ALARM.tripSeconds;
      state.message = 'THE ALARM TRIPS!';
      state.messageTime = 1.8;
      events |= EVENT_TRIP;
    }
    if (state.alarmT > 0 && seen) {
      state.pinT += dt;
      if (state.pinT >= ALARM.pinSeconds) {
        events |= caught('pinned in the open under a tripped alarm');
        return { events, done: true };
      }
    } else {
      state.pinT = 0;
    }
    return { events, done: false };
  }

  // Loot: walk close enough and it is lifted into the bag.
  function gatherLoot() {
    const p = state.player;
    let events = 0;
    for (const l of state.loot) {
      if (l.taken) continue;
      if (Math.hypot(l.x - p.x, l.y - p.y) >= PLAYER.grabRadius) continue;
      l.taken = true;
      state.lootTaken += l.value;
      state.bag += 1;
      state.message = `Lifted: $${l.value.toLocaleString('en-US')} — bag ${state.bag}`;
      state.messageTime = 1.3;
      events |= EVENT_LOOT;
    }
    return events;
  }

  // The van: step inside and the room is over.
  function tryVan() {
    const p = state.player;
    const van = state.room.van;
    const inside = p.x >= van.x && p.x <= van.x + van.w && p.y >= van.y && p.y <= van.y + van.h;
    return inside ? getaway() : 0;
  }

  function tick(dt) {
    let events = 0;
    if (state.messageTime > 0) state.messageTime -= dt;
    for (const r of state.ripples) r.age += dt;
    state.ripples = state.ripples.filter((r) => r.age < r.life);
    if (state.screen !== SCREEN_PLAY) return events;
    state.time += dt;
    state.elapsed += dt;

    const solids = solidsNow();
    const sight = sightNow(solids);

    ageTools(dt);
    moveThief(dt, solids);
    events |= doWork(dt);
    const camSee = watchCameras(sight);
    const watch = runGuards(dt, sight);
    events |= watch.events;
    if (watch.done) return events;
    const meter = updateAlarm(dt, watch.seen || camSee, watch.seen, watch.nearest, camSee);
    events |= meter.events;
    if (meter.done) return events;
    events |= gatherLoot();
    events |= tryVan();
    return events;
  }

  return { state, startCampaign, startRoom, tick, tossCoin, dropSmoke, bounds: BOUNDS };
}
