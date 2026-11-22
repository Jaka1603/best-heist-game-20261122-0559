// THE GILDED VAULT — the tuning table.
// One place holds every number the game balances on, so a tweak never
// means hunting through the rules, the guards and the renderer at once.
// The playfield is a fixed 1280 by 720: a 56-pixel HUD strip on top and
// the bank floor underneath it. Each table below is one line per system.

export const FIELD = { width: 1280, height: 720 };
export const HUD_H = 56;

// The simulation advances in fixed slices; the loop feeds it 1/60 s at a
// time so patrols, sweeps and the alarm are reproducible.
export const STEP = 1 / 60;

// The thief: quick on light feet, slower the heavier the bag gets.
// bagSlowPerItem is the speed lost per item past the second, capped at
// bagSlowMax; vaultSeconds and doorSeconds are the still-standing work
// times for the vault's dial and a locked door.
export const PLAYER = { radius: 13, speed: 186, grabRadius: 38, bagSlowPerItem: 0.04, bagSlowMax: 0.25, vaultSeconds: 2.5, doorSeconds: 1.2 };

// A guard: three paces (patrol, curious, hunting), a cone of sight, and
// the patience to wait at a waypoint before moving on. visionHalfAngle is
// half the cone's opening, in radians; searchTime is how long a guard
// scans a spot; loseSightAfter is when a chase cools off; catchDistance
// is close enough for a chasing guard's hands; stepRippleEvery paces the
// footstep ripples.
export const GUARD = { radius: 14, patrolSpeed: 78, investigateSpeed: 104, chaseSpeed: 158, visionRange: 172, visionHalfAngle: 0.62, waypointPause: 0.65, searchTime: 1.6, loseSightAfter: 2.0, catchDistance: 30, stepRippleEvery: 0.55 };

// A wall camera: it never moves, only sweeps, and its stare fills the
// meter at a flat rate while it holds the thief.
export const CAMERA = { range: 196, halfAngle: 0.42, fillPerSecond: 0.85 };

// The one shared alarm meter. guardFillBase is the fill rate at point
// blank, scaled by closeness; decayPerSecond is the drain out of sight;
// chaseThreshold is the meter above which a sighting means a chase;
// tripSeconds is the trip length; pinSeconds is how long a thief may
// stay plainly seen under a trip before being pinned; alertSpeedMul is
// how much faster guards move while the alarm is tripped.
export const ALARM = { guardFillBase: 1.35, decayPerSecond: 0.45, chaseThreshold: 0.5, tripSeconds: 6, pinSeconds: 0.7, alertSpeedMul: 1.3 };

// Tools cost uses, not money: coins to misdirect, smoke to blind.
// coinRange is how far a tossed coin flies along the facing;
// coinHearRadius is how far its ring carries; smokeRadius and
// smokeSeconds are the cloud's size and life.
export const TOOLS = { coins: 3, smokes: 2, coinRange: 150, coinHearRadius: 210, smokeRadius: 74, smokeSeconds: 3 };

// The look: dark marble, a red carpet down the middle, gilt and gold.
export const PALETTE = { floorA: '#3d3a44', floorB: '#37343f', carpet: '#6e2434', carpetEdge: '#8a2f42', caseSide: '#4a3b28', caseTop: '#8a6f45', glass: 'rgba(160, 210, 235, 0.20)', wall: '#2a2733', pillar: '#55506a', pillarTop: '#6d6785', vault: '#7a6a35', vaultDoor: '#a8894a', gold: '#f2c94c', gem: '#7fe3c8', cash: '#69b96a', painting: '#c86b98', cone: 'rgba(255, 196, 92, 0.15)', camCone: 'rgba(255, 160, 70, 0.13)', coneAlert: 'rgba(255, 110, 80, 0.22)', guard: '#3a4a6b', guardCap: '#232c42', guardAlert: '#c8503c', thief: '#22222c', thiefTrim: '#f2c94c', smoke: 'rgba(200, 205, 220, 0.55)', text: '#f2ecd9', muted: '#9aa3b8', danger: '#e5534b', good: '#37e08b' };

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Where the richest haul is remembered between visits.
export const BEST_KEY = 'gilded-vault.best';
