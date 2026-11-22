// The screenshot scenes behind ?shot=title|play|play2|clear.
// Each scene is a small posing function: it starts a real room and
// arranges the state a real heist passes through — two paintings already
// lifted and the meter warm, the vault half-cracked with a guard closing
// in — so the frame is what the game really looks like mid-play, and
// the same seed always gives the same frame.

import { SCREEN_CLEAR, SCREEN_TITLE } from './game.js';
import { MODE_INVESTIGATE } from './guards.js';

function poseTitle(game) {
  // The first room waits behind the veil.
  game.startRoom(0);
  game.state.screen = SCREEN_TITLE;
}

function posePlay(game) {
  const s = game.state;
  game.startRoom(0);
  s.loot[0].taken = true;
  s.loot[1].taken = true;
  s.lootTaken = 750;
  s.bag = 2;
  s.player.x = 520;
  s.player.y = 468;
  s.player.dir = -0.5;
  s.alarm = 0.35;
  s.message = 'Lifted: $350 — bag 2';
  s.messageTime = 99;
}

function poseVault(game) {
  const s = game.state;
  game.startRoom(2);
  // At the vault's face, the dial two-thirds turned, a guard curious,
  // and a smoke cloud drifting nearby.
  s.player.x = 640;
  s.player.y = 424;
  s.player.dir = -Math.PI / 2;
  s.vaultProgress = 1.55;
  s.work = { label: 'Cracking the vault…', frac: 0.62 };
  s.guards[2].mode = MODE_INVESTIGATE;
  s.guards[2].target = { x: 700, y: 400 };
  s.alarm = 0.66;
  s.smokeClouds.push({ x: 452, y: 470, r: 74, age: 1.1 });
  s.message = 'Cracking the vault…';
  s.messageTime = 99;
}

function poseClear(game) {
  const s = game.state;
  game.startRoom(1);
  s.lootTaken = 2850;
  s.roomGrade = 'S';
  s.screen = SCREEN_CLEAR;
}

const SCENES = {
  title: poseTitle,
  play: posePlay,
  play2: poseVault,
  clear: poseClear,
};

export function stageShot(name, game) {
  const pose = SCENES[name] ?? poseTitle;
  pose(game);
}
