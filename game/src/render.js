// THE GILDED VAULT — the renderer.
// The bank floor from above: dark marble chequers, a red carpet down
// the middle, glass cases and pedestals, paintings in gilt frames, the
// vault's great door, cameras sweeping amber cones, guards in navy with
// warm lantern cones — and in one frame, the thief, the loot, the tools
// and the alarm, all readable at a glance.
//
// The frame is painted back to front: floor, furniture, vault, loot,
// van, cones of sight, cameras, ripples, smoke, people, the trip glow,
// the HUD, the message, then the screen's overlay on top. Small shapes
// go through three helpers — disc, box and poly — so no figure is drawn
// twice the long way.

import { CAMERA, FIELD, FONT, GUARD, HUD_H, PALETTE } from './config.js';
import { ROOMS } from './rooms.js';
import {
  SCREEN_CAUGHT,
  SCREEN_CLEAR,
  SCREEN_PAUSED,
  SCREEN_TITLE,
  SCREEN_VICTORY,
} from './game.js';
import { MODE_CHASE, MODE_INVESTIGATE, MODE_SEARCH, MODE_STARE } from './guards.js';
import { conePolygon } from './vision.js';

// A rounded-corner rectangle path, ready to fill or stroke.
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A filled disc.
function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// A filled rectangle.
function box(ctx, x, y, w, h) {
  ctx.fillRect(x, y, w, h);
}

// A filled polygon from a list of [x, y] points.
function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

// One line of text in the game's font.
function txt(ctx, value, x, y, size, colour, align = 'left', weight = '600') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function cash(v) {
  return `$${v.toLocaleString('en-US')}`;
}

// The blockers an eye must look through: the room's furniture, shut
// doors, the vault, and live smoke. Built to mirror the rules module.
function lookThrough(state) {
  const doors = state.doors.filter((d) => !d.open).map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, kind: 'door' }));
  const vault = state.room.vault ? [{ x: state.room.vault.x, y: state.room.vault.y, w: state.room.vault.w, h: state.room.vault.h, kind: 'vault' }] : [];
  const smoke = state.smokeClouds.map((s) => ({ x: s.x, y: s.y, r: s.r, kind: 'smoke' }));
  return state.room.blockers.concat(doors, vault, smoke);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const hot = {};

  // The marble floor: alternating chequers, then the red carpet running
  // from the van up to the room's heart, edged in a darker red.
  function drawFloor() {
    const tile = 64;
    const rows = Math.ceil((FIELD.height - HUD_H) / tile);
    const cols = Math.ceil(FIELD.width / tile);
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 ? PALETTE.floorA : PALETTE.floorB;
        box(ctx, tx * tile, HUD_H + ty * tile, tile, tile);
      }
    }
    ctx.fillStyle = PALETTE.carpet;
    box(ctx, 590, HUD_H, 100, FIELD.height - HUD_H);
    ctx.fillStyle = PALETTE.carpetEdge;
    box(ctx, 590, HUD_H, 4, FIELD.height - HUD_H);
    box(ctx, 686, HUD_H, 4, FIELD.height - HUD_H);
  }

  // Cases, pedestals, pillars and walls, each with a soft shadow cast
  // down and to the right, then the doors: shut and locked with a brass
  // knob, or swung open flat against the wall.
  function drawProps(state) {
    for (const b of state.room.blockers) {
      if (typeof b.r === 'number') {
        // A pedestal or a statue: a round plinth with a lighter top.
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        disc(ctx, b.x + 3, b.y + 5, b.r);
        ctx.fillStyle = PALETTE.pillar;
        disc(ctx, b.x, b.y, b.r);
        ctx.fillStyle = PALETTE.pillarTop;
        disc(ctx, b.x, b.y, b.r - 6);
      } else if (b.kind === 'pillar' || b.kind === 'wall') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        box(ctx, b.x + 3, b.y + 5, b.w, b.h);
        ctx.fillStyle = PALETTE.pillar;
        box(ctx, b.x, b.y, b.w, b.h);
        ctx.fillStyle = PALETTE.pillarTop;
        box(ctx, b.x, b.y, b.w, 6);
      } else {
        // A display case: dark wood, a brass top, and a pane of glass
        // catching the light.
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        rr(ctx, b.x + 3, b.y + 5, b.w, b.h, 6);
        ctx.fill();
        ctx.fillStyle = PALETTE.caseSide;
        rr(ctx, b.x, b.y, b.w, b.h, 6);
        ctx.fill();
        ctx.fillStyle = PALETTE.caseTop;
        rr(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 4);
        ctx.fill();
        ctx.fillStyle = PALETTE.glass;
        poly(ctx, [
          [b.x + 10, b.y + b.h - 8],
          [b.x + b.w * 0.45, b.y + 6],
          [b.x + b.w * 0.62, b.y + 6],
          [b.x + 26, b.y + b.h - 8],
        ]);
      }
    }
    for (const d of state.doors) {
      if (d.open) {
        ctx.fillStyle = 'rgba(122, 106, 53, 0.5)';
        box(ctx, d.x, d.y, d.w, 6);
      } else {
        ctx.fillStyle = '#5e2430';
        box(ctx, d.x, d.y, d.w, d.h);
        ctx.fillStyle = PALETTE.gold;
        disc(ctx, d.x + d.w / 2, d.y + d.h / 2, 4);
      }
    }
  }

  // The vault: a great brass door with a dial, and while it is still
  // shut, the lit ring at its face where the thief stands to work it.
  function drawVault(state, t) {
    const v = state.room.vault;
    if (!v) return;
    if (!state.vaultCracked) {
      const glow = 0.5 + 0.3 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(242, 201, 76, ${glow})`;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(v.x - 4, v.y + v.h - 2, v.w + 8, 42);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    box(ctx, v.x + 4, v.y + 6, v.w, v.h);
    ctx.fillStyle = PALETTE.vault;
    box(ctx, v.x, v.y, v.w, v.h);
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const outer = Math.min(v.w, v.h) / 2 - 10;
    ctx.fillStyle = PALETTE.vaultDoor;
    disc(ctx, cx, cy, outer);
    ctx.strokeStyle = '#6e5a28';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, outer - 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#6e5a28';
    disc(ctx, cx, cy, 7);
    txt(ctx, state.vaultCracked ? 'OPEN' : 'VAULT', cx, v.y + 16, 13, '#3a2f10', 'center', '800');
  }

  // Every piece of loot still on the floor, bobbing gently, priced
  // underneath so the thief can weigh the risk at a glance.
  function drawLoot(state, t) {
    for (const l of state.loot) {
      if (l.taken) continue;
      const y = l.y + Math.sin(t * 2.4 + l.x) * 1.5;
      if (l.kind === 'painting') {
        ctx.fillStyle = '#6e5a28';
        box(ctx, l.x - 17, y - 13, 34, 26);
        ctx.fillStyle = PALETTE.painting;
        box(ctx, l.x - 13, y - 9, 26, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        disc(ctx, l.x + 4, y - 2, 4.5);
      } else if (l.kind === 'gem') {
        ctx.fillStyle = PALETTE.gem;
        poly(ctx, [[l.x, y - 11], [l.x + 9, y], [l.x, y + 11], [l.x - 9, y]]);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        poly(ctx, [[l.x, y - 11], [l.x + 4, y - 2], [l.x - 4, y - 2]]);
      } else if (l.kind === 'cash') {
        ctx.fillStyle = PALETTE.cash;
        box(ctx, l.x - 13, y - 6, 26, 13);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        box(ctx, l.x - 13, y - 1, 26, 3);
        ctx.fillStyle = '#dff5df';
        disc(ctx, l.x, y, 3.4);
      } else {
        // Gold bars, stacked two high.
        ctx.fillStyle = PALETTE.gold;
        poly(ctx, [[l.x - 13, y + 6], [l.x - 9, y - 4], [l.x + 9, y - 4], [l.x + 13, y + 6]]);
        poly(ctx, [[l.x - 8, y - 3], [l.x - 5, y - 11], [l.x + 5, y - 11], [l.x + 8, y - 3]]);
      }
      txt(ctx, cash(l.value), l.x, l.y + 24, 11, 'rgba(242,236,217,0.75)', 'center', '700');
    }
  }

  // The getaway van: a dark slab with a pulsing green outline.
  function drawVan(state, t) {
    const v = state.room.van;
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    ctx.fillStyle = '#191922';
    rr(ctx, v.x, v.y, v.w, v.h, 8);
    ctx.fill();
    ctx.strokeStyle = `rgba(55, 224, 139, ${pulse})`;
    ctx.lineWidth = 2.5;
    rr(ctx, v.x, v.y, v.w, v.h, 8);
    ctx.stroke();
    txt(ctx, 'GETAWAY VAN', v.x + v.w / 2, v.y + v.h / 2, 14, PALETTE.good, 'center', '800');
  }

  // The cones of sight, drawn additively so overlapping light glows:
  // amber for cameras, warm gold for guards, red when something is seen.
  function drawCones(state, blockers) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fillFan = (x, y, dir, range, half, colour) => {
      const fan = conePolygon(x, y, dir, blockers, range, half);
      ctx.fillStyle = colour;
      poly(ctx, fan);
    };
    for (const c of state.cameras) {
      fillFan(c.x, c.y, c.dir, CAMERA.range, CAMERA.halfAngle, c.sees ? PALETTE.coneAlert : PALETTE.camCone);
    }
    for (const g of state.guards) {
      fillFan(g.x, g.y, g.dir, GUARD.visionRange, GUARD.visionHalfAngle, g.mode === MODE_CHASE ? PALETTE.coneAlert : PALETTE.cone);
    }
    ctx.restore();
  }

  // The camera bodies: a dark dome with a lens that glows amber — red
  // while the camera holds the thief in its cone.
  function drawCameras(state) {
    for (const c of state.cameras) {
      ctx.fillStyle = '#101018';
      disc(ctx, c.x, c.y, 9);
      ctx.fillStyle = c.sees ? PALETTE.danger : '#ffd98a';
      disc(ctx, c.x + Math.cos(c.dir) * 5, c.y + Math.sin(c.dir) * 5, 3.4);
    }
  }

  // Footstep ripples, and the coin's ringing circle where it landed.
  function drawEffects(state) {
    for (const r of state.ripples) {
      const frac = r.age / r.life;
      ctx.strokeStyle = `rgba(255, 220, 150, ${0.35 * (1 - frac)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6 + frac * 28, 0, Math.PI * 2);
      ctx.stroke();
    }
    const coin = state.coin;
    if (coin) {
      const ring = (state.elapsed * 60) % 34;
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6 + ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      disc(ctx, coin.x, coin.y, 4.5);
    }
  }

  // Smoke: a soft grey disc, fading as its three seconds run out.
  function drawSmoke(state) {
    for (const s of state.smokeClouds) {
      const fade = 1 - s.age / 3;
      const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(205, 210, 225, ${0.6 * fade})`);
      g.addColorStop(1, 'rgba(205, 210, 225, 0)');
      ctx.fillStyle = g;
      disc(ctx, s.x, s.y, s.r);
    }
  }

  // One figure on the floor: a shadow, a body, and a facing mark.
  function drawFigure(x, y, dir, body, trim) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 4, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    disc(ctx, x, y, 13);
    ctx.fillStyle = trim;
    disc(ctx, x + Math.cos(dir) * 6, y + Math.sin(dir) * 6, 7);
  }

  // Guards and the thief. A suspicious guard wears a gold '?', a
  // chasing one a red '!'. The work ring shows above the thief while a
  // lock is picked or a vault cracked.
  function drawActors(state) {
    for (const g of state.guards) {
      const hunting = g.mode === MODE_CHASE;
      drawFigure(g.x, g.y, g.dir, hunting ? PALETTE.guardAlert : PALETTE.guard, PALETTE.guardCap);
      ctx.fillStyle = '#ffd98a';
      disc(ctx, g.x + Math.cos(g.dir) * 12, g.y + Math.sin(g.dir) * 12, 3.4);
      const suspicious = g.mode === MODE_STARE || g.mode === MODE_INVESTIGATE || g.mode === MODE_SEARCH;
      if (suspicious) txt(ctx, '?', g.x, g.y - 26, 19, PALETTE.gold, 'center', '800');
      else if (hunting) txt(ctx, '!', g.x, g.y - 26, 20, PALETTE.danger, 'center', '800');
    }
    const p = state.player;
    drawFigure(p.x, p.y, p.dir, PALETTE.thief, PALETTE.thiefTrim);
    if (state.work) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 21, -Math.PI / 2, -Math.PI / 2 + state.work.frac * Math.PI * 2);
      ctx.stroke();
      txt(ctx, state.work.label, p.x, p.y - 34, 13, PALETTE.text, 'center', '700');
    }
  }

  // The HUD strip: the room's name, the alarm meter and its word, the
  // loot carried against the room's total, the tools left, the clock.
  function drawHud(state) {
    ctx.fillStyle = 'rgba(8, 8, 14, 0.94)';
    box(ctx, 0, 0, FIELD.width, HUD_H);
    ctx.fillStyle = PALETTE.gold;
    box(ctx, 0, HUD_H - 2, FIELD.width, 2);
    txt(ctx, state.room.name, 20, HUD_H / 2, 17, PALETTE.text, 'left', '700');
    const mx = 372;
    const mw = 230;
    const my = HUD_H / 2 - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, mx, my, mw, 16, 8);
    ctx.fill();
    if (state.alarm > 0) {
      const hot = state.alarmT > 0 ? PALETTE.danger : state.alarm > 0.6 ? '#f2994a' : PALETTE.gold;
      ctx.fillStyle = hot;
      rr(ctx, mx, my, Math.max(16, mw * state.alarm), 16, 8);
      ctx.fill();
    }
    const word = state.alarmT > 0 ? 'ALARM!' : state.seenNow ? 'EXPOSED' : 'UNSEEN';
    const wordColour = state.alarmT > 0 || state.seenNow ? PALETTE.danger : PALETTE.good;
    txt(ctx, word, mx + mw + 14, HUD_H / 2, 14, wordColour, 'left', '800');
    txt(ctx, `LOOT ${cash(state.lootTaken)} / ${cash(state.lootTotal)}`, 800, HUD_H / 2, 15, PALETTE.gold, 'left', '700');
    txt(ctx, `COIN x${state.coins}  SMOKE x${state.smokesLeft}`, 1010, HUD_H / 2, 13, PALETTE.muted, 'left', '700');
    txt(ctx, `${Math.floor(state.time)}s`, 1248, HUD_H / 2, 14, PALETTE.muted, 'right', '600');
  }

  // The one-line message under the HUD, while it lives.
  function drawToast(state) {
    if (state.message && state.messageTime > 0 && state.screen === 'play') {
      txt(ctx, state.message, FIELD.width / 2, 84, 17, PALETTE.text, 'center', '700');
    }
  }

  // A pulsing red edge while the alarm is tripped.
  function drawAlarmGlow(state, t) {
    if (state.alarmT <= 0 || state.screen !== 'play') return;
    const a = 0.1 + 0.08 * Math.sin(t * 10);
    const g = ctx.createRadialGradient(640, 390, 320, 640, 390, 720);
    g.addColorStop(0, 'rgba(229, 83, 75, 0)');
    g.addColorStop(1, `rgba(229, 83, 75, ${a + 0.1})`);
    ctx.fillStyle = g;
    box(ctx, 0, HUD_H, FIELD.width, FIELD.height - HUD_H);
  }

  // A menu button, and its hit box remembered for clicks.
  function drawButton(id, text, x, y, w, h, primary) {
    ctx.fillStyle = primary ? PALETTE.gold : 'rgba(255,255,255,0.1)';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    if (!primary) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      rr(ctx, x, y, w, h, 10);
      ctx.stroke();
    }
    txt(ctx, text, x + w / 2, y + h / 2 + 1, 18, primary ? '#241d05' : PALETTE.text, 'center', '800');
    hot[id] = { x, y, w, h };
  }

  function shade(alpha) {
    ctx.fillStyle = `rgba(5, 5, 10, ${alpha})`;
    box(ctx, 0, 0, FIELD.width, FIELD.height);
  }

  // Centred overlay lines, each [text, y, size, colour, weight].
  function overlayLines(lines) {
    for (const [text, y, size, colour, weight] of lines) {
      txt(ctx, text, FIELD.width / 2, y, size, colour, 'center', weight);
    }
  }

  function screenTitle(best) {
    shade(0.52);
    overlayLines([
      ['THE GILDED VAULT', 200, 56, PALETTE.text, '800'],
      ['Four rooms. One van. Everything that is not nailed down.', 246, 20, PALETTE.gold, '600'],
      ['Guards and sweeping cameras fill one alarm meter — trip it and they hunt on sight.', 298, 16, PALETTE.text, '500'],
      ['Toss a coin (Q) to pull a guard away. Drop smoke (F) to blind every eye. Stand still', 322, 16, PALETTE.text, '500'],
      ['at a locked door or the vault\u2019s face to work it open. A heavy bag slows you down.', 346, 16, PALETTE.text, '500'],
      ['Reach the van whenever you dare: what you carry is what you keep. WASD or arrows to move.', 378, 15, PALETTE.muted, '500'],
    ]);
    drawButton('start', 'BEGIN THE HEIST', FIELD.width / 2 - 120, 424, 240, 54, true);
    if (best > 0) txt(ctx, `Richest haul: ${cash(best)}`, FIELD.width / 2, 514, 15, PALETTE.muted, 'center', '600');
  }

  function screenClear(state) {
    shade(0.55);
    overlayLines([
      ['CLEAN GETAWAY', 250, 44, PALETTE.good, '800'],
      [`${state.room.name} — carried out ${cash(state.lootTaken)} of ${cash(state.lootTotal)}`, 302, 19, PALETTE.text, '600'],
      [`Room grade ${state.roomGrade}`, 336, 22, PALETTE.gold, '800'],
    ]);
    const last = state.roomIndex >= ROOMS.length - 1;
    drawButton('next', last ? 'SEE THE HAUL' : 'NEXT ROOM', FIELD.width / 2 - 110, 384, 220, 52, true);
  }

  function screenCaught(state) {
    shade(0.6);
    overlayLines([
      ['CAUGHT', 254, 48, PALETTE.danger, '800'],
      [`${state.room.name} — ${state.caughtBy}.`, 304, 18, PALETTE.text, '600'],
      ['The room resets. What earlier rooms paid is already in the van.', 336, 15, PALETTE.muted, '500'],
    ]);
    drawButton('retry', 'TRY THE ROOM AGAIN', FIELD.width / 2 - 125, 380, 250, 52, true);
  }

  function screenVictory(state, best) {
    shade(0.55);
    overlayLines([
      ['THE HAUL', 232, 46, PALETTE.gold, '800'],
      [`${cash(state.totalLoot)}${state.totalLoot >= best ? ' — the richest haul yet!' : ''}`, 284, 24, PALETTE.text, '700'],
      [`Room grades: ${state.grades.join(' · ')}`, 322, 17, PALETTE.muted, '600'],
    ]);
    drawButton('retry', 'RUN IT AGAIN', FIELD.width / 2 - 105, 366, 210, 52, true);
  }

  function screenPaused() {
    shade(0.6);
    overlayLines([
      ['PAUSED', 296, 42, PALETTE.text, '800'],
      ['P or Esc to move again', 342, 16, PALETTE.muted, '500'],
    ]);
    drawButton('resume', 'RESUME', FIELD.width / 2 - 90, 376, 180, 50, true);
  }

  // One full frame, in layer order.
  function draw(state, best, t) {
    for (const key of Object.keys(hot)) delete hot[key];
    const blockers = lookThrough(state);
    drawFloor();
    drawProps(state);
    drawVault(state, t);
    drawLoot(state, t);
    drawVan(state, t);
    drawCones(state, blockers);
    drawCameras(state);
    drawEffects(state);
    drawSmoke(state);
    drawActors(state);
    drawAlarmGlow(state, t);
    drawHud(state);
    drawToast(state);
    if (state.screen === SCREEN_TITLE) screenTitle(best);
    else if (state.screen === SCREEN_CLEAR) screenClear(state);
    else if (state.screen === SCREEN_CAUGHT) screenCaught(state);
    else if (state.screen === SCREEN_VICTORY) screenVictory(state, best);
    else if (state.screen === SCREEN_PAUSED) screenPaused();
  }

  return { draw, hot };
}
