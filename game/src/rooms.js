// THE GILDED VAULT — the four rooms, as data.
// Coordinates live on the 1280x720 field; the floor itself starts under
// the HUD at y=56. Furniture comes in two shapes: rectangles (display
// cases, pillars, walls) and circles (pedestals, statues). A locked door
// is a rectangle with an id — stand beside it and hold still and the
// lock picks open. The vault is a rectangle too, and it cracks the same
// way, from the lit ring at its face. Loot sits where it is drawn:
// paintings, gems, cash and gold. The van idles at the bottom of every
// room, and reaching it is how a room ends.
//
// The helpers below keep the room tables short: rect() for a case or a
// slab of wall, post() for a square pillar, disc() for a round pedestal,
// gate() for a locked door, prize() for one piece of loot, patrol() for
// a guard's waypoint loop, cam() for a sweeping camera, and room() to
// gather one room's parts in a fixed order.

function rect(x, y, w, h, kind = 'case') {
  return { x, y, w, h, kind };
}

function post(x, y, w, h) {
  return { x, y, w, h, kind: 'pillar' };
}

function disc(x, y, r) {
  return { x, y, r, kind: 'pedestal' };
}

function gate(x, y, w, h, id) {
  return { x, y, w, h, kind: 'door', id };
}

function prize(x, y, kind, value) {
  return { x, y, kind, value };
}

function patrol(...points) {
  return { path: points };
}

function cam(x, y, baseDir, sweep, speed, phase) {
  return { x, y, baseDir, sweep, speed, phase };
}

function room(name, playerStart, blockers, doors, vault, guards, cameras, loot) {
  return { name, playerStart, van: VAN, blockers, doors, vault, guards, cameras, loot };
}

// The van is the same shape in every room: the getaway, always waiting.
const VAN = { x: 565, y: 670, w: 150, h: 44 };

export const ROOMS = [
  room('Room 1 — The Lobby Gallery', { x: 640, y: 622 },
    [rect(300, 200, 120, 40), rect(560, 200, 120, 40), rect(820, 200, 120, 40),
     disc(400, 420, 20), disc(700, 420, 20),
     rect(150, 320, 26, 140, 'pillar'), rect(1104, 320, 26, 140, 'pillar'),
     rect(240, 560, 80, 26), rect(960, 560, 80, 26)],
    [], null,
    [patrol([200, 140], [1080, 140], [1080, 245], [200, 245]),
     patrol([1080, 605], [200, 605], [200, 505], [1080, 505])],
    [cam(640, 72, Math.PI / 2, 0.7, 0.5, 0)],
    [prize(360, 272, 'painting', 400), prize(620, 272, 'painting', 350),
     prize(880, 272, 'painting', 450), prize(400, 420, 'gem', 300),
     prize(700, 420, 'gem', 400), prize(180, 645, 'cash', 250),
     prize(1100, 170, 'gold', 500)]),
  room('Room 2 — The Sculpture Wing', { x: 640, y: 628 },
    [disc(320, 240, 24), disc(640, 240, 24), disc(960, 240, 24),
     rect(200, 430, 110, 38), rect(540, 430, 110, 38), rect(880, 430, 110, 38),
     rect(120, 330, 480, 22, 'wall'), rect(660, 330, 500, 22, 'wall')],
    [gate(600, 330, 60, 22, 'wing-door')], null,
    [patrol([180, 560], [1100, 560], [1100, 645], [180, 645]),
     patrol([200, 150], [1080, 150], [1080, 245], [200, 245]),
     patrol([1080, 245], [200, 245])],
    [cam(120, 76, Math.PI / 3, 0.55, 0.45, 1),
     cam(1160, 76, (2 * Math.PI) / 3, 0.55, 0.45, 3)],
    [prize(240, 478, 'cash', 300), prize(595, 478, 'gem', 350),
     prize(320, 175, 'painting', 500), prize(640, 175, 'painting', 550),
     prize(960, 175, 'gold', 600), prize(640, 118, 'gem', 800)]),
  room('Room 3 — The Vault Antechamber', { x: 640, y: 628 },
    [post(240, 200, 34, 34), post(1006, 200, 34, 34),
     post(240, 470, 34, 34), post(1006, 470, 34, 34),
     rect(480, 180, 140, 36), rect(480, 500, 140, 36)],
    [], { x: 565, y: 290, w: 150, h: 100, value: 5000 },
    [patrol([140, 140], [1140, 140], [1140, 225], [140, 225]),
     patrol([140, 625], [1140, 625]),
     patrol([920, 360], [360, 360])],
    [cam(84, 360, 0, 0.5, 0.5, 0),
     cam(1196, 360, Math.PI, 0.5, 0.5, 2)],
    [prize(550, 158, 'painting', 600), prize(550, 552, 'gem', 500),
     prize(1085, 300, 'cash', 450), prize(195, 300, 'gold', 550),
     prize(1085, 470, 'painting', 650)]),
  room('Room 4 — The Gilded Vault', { x: 640, y: 628 },
    [rect(240, 180, 110, 36), rect(540, 180, 110, 36), rect(840, 180, 110, 36),
     rect(240, 520, 110, 36), rect(540, 520, 110, 36), rect(840, 520, 110, 36),
     post(120, 330, 30, 60), post(1130, 330, 30, 60)],
    [], { x: 540, y: 300, w: 200, h: 120, value: 10000 },
    [patrol([160, 120], [1120, 120]),
     patrol([1120, 645], [160, 645]),
     patrol([180, 250], [180, 470], [420, 470], [420, 250]),
     patrol([860, 250], [1100, 250], [1100, 470], [860, 470])],
    [cam(640, 72, Math.PI / 2, 0.8, 0.55, 0),
     cam(76, 660, -Math.PI / 3, 0.5, 0.5, 1.5),
     cam(1204, 660, Math.PI + Math.PI / 3, 0.5, 0.5, 4)],
    [prize(295, 240, 'painting', 700), prize(595, 240, 'gem', 800),
     prize(895, 240, 'painting', 900), prize(295, 478, 'gold', 750),
     prize(895, 478, 'gem', 850), prize(640, 600, 'cash', 1000)]),
];
