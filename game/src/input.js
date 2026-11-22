// Input: held keys become a movement vector on the state; taps become
// named actions — Q tosses a coin, F drops smoke. Clicks are reported in
// field coordinates, so the shell can hit-test the menu buttons.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_COIN = 'coin';
export const ACTION_SMOKE = 'smoke';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

// Keys that fire once per press, by the key the browser reports.
const TAPS = new Map([
  ['Enter', ACTION_CONFIRM],
  [' ', ACTION_CONFIRM],
  ['q', ACTION_COIN],
  ['Q', ACTION_COIN],
  ['f', ACTION_SMOKE],
  ['F', ACTION_SMOKE],
  ['p', ACTION_PAUSE],
  ['P', ACTION_PAUSE],
  ['Escape', ACTION_PAUSE],
  ['m', ACTION_MUTE],
  ['M', ACTION_MUTE],
  ['r', ACTION_RESTART],
  ['R', ACTION_RESTART],
]);

// Keys that stay held, by physical code: both the arrows and WASD.
const HELD = new Map([
  ['ArrowUp', 'up'],
  ['KeyW', 'up'],
  ['ArrowDown', 'down'],
  ['KeyS', 'down'],
  ['ArrowLeft', 'left'],
  ['KeyA', 'left'],
  ['ArrowRight', 'right'],
  ['KeyD', 'right'],
]);

export function createInput(canvas, inputState, handlers) {
  const held = { up: false, down: false, left: false, right: false };

  function refresh() {
    const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    inputState.x = x;
    inputState.y = y;
  }

  window.addEventListener('keydown', (event) => {
    const dir = HELD.get(event.code);
    if (dir) {
      held[dir] = true;
      refresh();
      event.preventDefault();
      return;
    }
    const action = TAPS.get(event.key);
    if (action && !event.repeat) {
      event.preventDefault();
      handlers.onAction(action);
    }
  });

  window.addEventListener('keyup', (event) => {
    const dir = HELD.get(event.code);
    if (dir) {
      held[dir] = false;
      refresh();
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((event.clientY - rect.top) / rect.height) * FIELD.height;
    handlers.onPoint({ x, y });
  });

  return { refresh };
}
