// Boot and the one loop: held keys fill the input vector, the game
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, getaway, caught, victory, paused.
//
// ?shot=title|play|play2|clear (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.

import { BEST_KEY, STEP } from './config.js';
import { ROOMS } from './rooms.js';
import {
  createGame,
  EVENT_CAUGHT,
  EVENT_COIN,
  EVENT_DOOR,
  EVENT_GETAWAY,
  EVENT_LOOT,
  EVENT_SEEN,
  EVENT_SMOKE,
  EVENT_TRIP,
  EVENT_VAULT,
  SCREEN_CAUGHT,
  SCREEN_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_VICTORY,
} from './game.js';
import {
  createInput,
  ACTION_COIN,
  ACTION_CONFIRM,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_SMOKE,
} from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

// A frame may never swallow more than a quarter-second of lag at once.
const MAX_FRAME = 0.25;
// At most five fixed steps per frame; beyond that the excess is dropped.
const MAX_STEPS = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame();
const renderer = createRenderer(canvas);
const audio = createAudio();
const state = game.state;

window.__game = { state, game };

function readBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY) ?? '0';
    return Number.parseInt(raw, 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: then the best lasts this visit only.
  }
}

let best = readBest();

// Turn a tick's event bits into sounds.
function playEvents(events) {
  const sounds = [
    [EVENT_SEEN, () => audio.seen()],
    [EVENT_LOOT, () => audio.loot(state.bag)],
    [EVENT_COIN, () => audio.coin()],
    [EVENT_SMOKE, () => audio.smoke()],
    [EVENT_DOOR, () => audio.door()],
    [EVENT_VAULT, () => audio.vault()],
    [EVENT_TRIP, () => audio.trip()],
    [EVENT_CAUGHT, () => audio.caught()],
    [EVENT_GETAWAY, () => audio.getaway()],
  ];
  for (const [bit, play] of sounds) {
    if (events & bit) play();
  }
}

// The last room is cleared: the campaign is over and the haul is totalled.
function finishCampaign() {
  state.screen = SCREEN_VICTORY;
  if (state.totalLoot > best) {
    best = state.totalLoot;
    saveBest(best);
  }
  status.textContent = `Heist complete. Total haul $${state.totalLoot.toLocaleString('en-US')}.`;
}

// What the primary button or key does on each screen.
const PRIMARY = {
  [SCREEN_TITLE]() {
    audio.unlock();
    audio.click();
    game.startCampaign();
    status.textContent = ROOMS[0].name;
  },
  [SCREEN_CLEAR]() {
    audio.click();
    if (state.roomIndex >= ROOMS.length - 1) finishCampaign();
    else game.startRoom(state.roomIndex + 1);
  },
  [SCREEN_CAUGHT]() {
    audio.click();
    game.startRoom(state.roomIndex);
  },
  [SCREEN_VICTORY]() {
    audio.click();
    game.startCampaign();
  },
  [SCREEN_PAUSED]() {
    state.screen = SCREEN_PLAY;
  },
};

function primaryAction() {
  const go = PRIMARY[state.screen];
  if (go) go();
}

function togglePause() {
  if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
  else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
}

// Screenshot mode: pose the scene, paint it twice so every gradient and
// cone settles, then raise the flag the capture script waits on.
function runShot(name) {
  stageShot(name, game);
  let painted = 0;
  const paint = () => {
    renderer.draw(state, best, 1.25);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
}

function runGame() {
  createInput(canvas, state.input, {
    onPoint(point) {
      audio.unlock();
      // Repaint before hit-testing: a click in the same instant as a
      // screen change must test the screen being looked at.
      renderer.draw(state, best, performance.now() / 1000);
      const hot = renderer.hot;
      const hit = (r) => r && point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;
      if (hit(hot.start) || hit(hot.next) || hit(hot.retry) || hit(hot.resume)) primaryAction();
    },
    onAction(action) {
      audio.unlock();
      if (action === ACTION_CONFIRM) primaryAction();
      else if (action === ACTION_COIN) playEvents(game.tossCoin());
      else if (action === ACTION_SMOKE) playEvents(game.dropSmoke());
      else if (action === ACTION_PAUSE) togglePause();
      else if (action === ACTION_MUTE) audio.toggleMute();
      else if (action === ACTION_RESTART && state.screen !== SCREEN_TITLE) game.startRoom(state.roomIndex);
    },
  });

  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      playEvents(game.tick(STEP));
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS) accumulator = 0;
    renderer.draw(state, best, now / 1000);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
