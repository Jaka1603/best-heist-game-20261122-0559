// The guards of THE GILDED VAULT.
// A guard lives in one of six moods, and each mood is a small handler
// below. He patrols his waypoint loop and pauses at each stop; when
// something catches his eye he stares at it; when the alarm justifies
// it he chases; when he loses the thief — or hears a coin ring — he
// walks to the last place that mattered and searches it, scanning left
// and right, then walks back to his loop. A tripped alarm drops the
// chase threshold to nothing and quickens every step, so the whole
// floor turns hunter at once.

import { ALARM, GUARD } from './config.js';
import { angleDiff, canSeeFrom, moveCircle } from './vision.js';

export const MODE_PATROL = 'patrol';
export const MODE_STARE = 'stare';
export const MODE_CHASE = 'chase';
export const MODE_INVESTIGATE = 'investigate';
export const MODE_SEARCH = 'search';
export const MODE_RETURN = 'return';

// A guard starts at the first waypoint, facing the second.
export function createGuard(def) {
  const start = def.path[0];
  const next = def.path.length > 1 ? def.path[1] : def.path[0];
  return {
    x: start[0],
    y: start[1],
    dir: Math.atan2(next[1] - start[1], next[0] - start[0]),
    mode: MODE_PATROL,
    path: def.path,
    wp: 1 % Math.max(1, def.path.length),
    waitT: 0,
    target: null,
    lastSeen: null,
    loseT: 0,
    searchT: 0,
    searchBaseDir: 0,
    rippleT: Math.random() * GUARD.stepRippleEvery,
    speedMul: def.speedMul ?? 1,
    seesPlayer: false,
    seeDist: -1,
    moving: false,
  };
}

// Turn toward (tx, ty) at most `rate` rad/s.
function faceToward(g, tx, ty, rate, dt) {
  const heading = Math.atan2(ty - g.y, tx - g.x);
  const turn = angleDiff(heading, g.dir);
  g.dir += Math.max(-rate * dt, Math.min(rate * dt, turn));
}

// Walk toward (tx, ty) at `speed`, turning as faceToward allows, and
// stop at blockers. True when the guard has arrived.
function stepToward(g, tx, ty, speed, dt, blockers, bounds) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) {
    g.moving = false;
    return true;
  }
  faceToward(g, tx, ty, 3.6, dt);
  const stride = Math.min(dist, speed * dt);
  moveCircle(g, Math.cos(g.dir) * stride, Math.sin(g.dir) * stride, blockers, bounds, GUARD.radius);
  g.moving = true;
  return dist <= Math.max(6, stride + 2);
}

// The waypoint nearest to where the guard stands now.
function nearestStop(g) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < g.path.length; i += 1) {
    const px = g.path[i][0] - g.x;
    const py = g.path[i][1] - g.y;
    const d = px * px + py * py;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// When the thief is gone from sight, go and look where he was last
// seen — or walk back, when there is nowhere to look.
function goLook(g) {
  if (g.lastSeen) {
    g.mode = MODE_INVESTIGATE;
    g.target = { x: g.lastSeen.x, y: g.lastSeen.y };
  } else {
    g.mode = MODE_RETURN;
  }
}

const HANDLERS = {
  [MODE_PATROL](g, dt, view, chaseNow, pace) {
    if (chaseNow) {
      g.mode = MODE_CHASE;
      return;
    }
    if (g.seesPlayer) {
      g.mode = MODE_STARE;
      return;
    }
    if (view.distraction) {
      g.mode = MODE_INVESTIGATE;
      g.target = { x: view.distraction.x, y: view.distraction.y };
      return;
    }
    if (g.waitT > 0) {
      g.waitT -= dt;
      g.moving = false;
      return;
    }
    const stop = g.path[g.wp];
    const arrived = stepToward(g, stop[0], stop[1], GUARD.patrolSpeed * pace, dt, view.blockers, view.bounds);
    if (arrived) {
      g.wp = (g.wp + 1) % g.path.length;
      g.waitT = GUARD.waypointPause;
    }
  },

  [MODE_STARE](g, dt, view, chaseNow) {
    if (!g.seesPlayer) {
      goLook(g);
      return;
    }
    faceToward(g, view.player.x, view.player.y, 5, dt);
    g.moving = false;
    if (chaseNow) g.mode = MODE_CHASE;
  },

  [MODE_CHASE](g, dt, view, _chaseNow, pace) {
    if (!g.seesPlayer) {
      g.loseT += dt;
      if (g.loseT > GUARD.loseSightAfter) {
        goLook(g);
        return;
      }
    }
    const tx = g.lastSeen ? g.lastSeen.x : view.player.x;
    const ty = g.lastSeen ? g.lastSeen.y : view.player.y;
    stepToward(g, tx, ty, GUARD.chaseSpeed * pace, dt, view.blockers, view.bounds);
  },

  [MODE_INVESTIGATE](g, dt, view, chaseNow, pace) {
    if (chaseNow) {
      g.mode = MODE_CHASE;
      return;
    }
    if (!g.target) {
      g.mode = MODE_RETURN;
      return;
    }
    const arrived = stepToward(g, g.target.x, g.target.y, GUARD.investigateSpeed * pace, dt, view.blockers, view.bounds);
    if (arrived) {
      g.mode = MODE_SEARCH;
      g.searchT = GUARD.searchTime;
      g.searchBaseDir = g.dir;
    }
  },

  [MODE_SEARCH](g, dt, view, chaseNow) {
    if (g.seesPlayer) {
      g.mode = chaseNow ? MODE_CHASE : MODE_STARE;
      return;
    }
    g.moving = false;
    g.searchT -= dt;
    // Sweep the head from side to side while searching.
    const sweep = Math.sin((GUARD.searchTime - g.searchT) * 2.4) * 0.9;
    g.dir = g.searchBaseDir + sweep;
    if (g.searchT <= 0) g.mode = MODE_RETURN;
  },

  [MODE_RETURN](g, dt, view, chaseNow, pace) {
    if (g.seesPlayer) {
      g.mode = chaseNow ? MODE_CHASE : MODE_STARE;
      return;
    }
    const idx = nearestStop(g);
    const stop = g.path[idx];
    const arrived = stepToward(g, stop[0], stop[1], GUARD.investigateSpeed * pace, dt, view.blockers, view.bounds);
    if (arrived) {
      g.wp = (idx + 1) % g.path.length;
      g.mode = MODE_PATROL;
      g.waitT = 0.2;
    }
  },
};

// One guard, one step. `view` carries the thief, the blockers (smoke
// included), the bounds, the alarm meter, whether the alarm has tripped,
// and any distraction — a coin's ringing spot — the guard could hear.
// Returns a list of small event names; 'ripple' marks a footstep.
export function updateGuard(g, dt, view) {
  const events = [];
  g.seeDist = canSeeFrom(g.x, g.y, g.dir, view.player.x, view.player.y, view.blockers, GUARD.visionRange, GUARD.visionHalfAngle);
  g.seesPlayer = g.seeDist >= 0;
  if (g.seesPlayer) {
    g.lastSeen = { x: view.player.x, y: view.player.y };
    g.loseT = 0;
  }
  // Chase when the thief is seen and the meter is high — or the alarm
  // has already tripped, in which case any sighting is enough.
  const chaseNow = g.seesPlayer && (view.meter > ALARM.chaseThreshold || view.alarmTripped);
  const pace = g.speedMul * (view.alarmTripped ? ALARM.alertSpeedMul : 1);

  const handle = HANDLERS[g.mode] ?? HANDLERS[MODE_PATROL];
  if (!HANDLERS[g.mode]) g.mode = MODE_PATROL;
  handle(g, dt, view, chaseNow, pace);

  // Footstep ripples, one per pace while walking.
  if (g.moving) {
    g.rippleT -= dt;
    if (g.rippleT <= 0) {
      g.rippleT = GUARD.stepRippleEvery;
      events.push('ripple');
    }
  }
  return events;
}
