// Sight and movement geometry for THE GILDED VAULT.
// Obstacles come in two shapes — rectangles (a case, a pillar, a wall,
// a door, the vault) and circles (a pedestal, a statue, a smoke cloud)
// — and either shape stops a gaze and stops a walking body. A circle is
// any blocker carrying a radius; anything else is a rectangle.
//
// The helpers below are written around one idea: a segment test that
// answers "does this straight line touch that shape", used both for
// eyesight and for the fan of a vision cone.

function isRound(b) {
  return typeof b.r === 'number';
}

// The interval test for a rectangle: intersect the segment's parameter
// range with the range where it is inside the rect, one axis at a time.
// Anything left means the segment touches the rectangle.
function lineTouchesRect(x1, y1, x2, y2, r) {
  let tMin = 0;
  let tMax = 1;
  const dx = x2 - x1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let a = (r.x - x1) / dx;
    let b = (r.x + r.w - x1) / dx;
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    if (a > tMin) tMin = a;
    if (b < tMax) tMax = b;
    if (tMin > tMax) return false;
  }
  const dy = y2 - y1;
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let a = (r.y - y1) / dy;
    let b = (r.y + r.h - y1) / dy;
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    if (a > tMin) tMin = a;
    if (b < tMax) tMax = b;
    if (tMin > tMax) return false;
  }
  return true;
}

// The quadratic test for a circle: solve where the line meets the
// circle, and count a hit when a meeting point lies on the segment —
// or when either end of the segment already sits inside the circle.
function lineTouchesRound(x1, y1, x2, y2, c) {
  const fx = x1 - c.x;
  const fy = y1 - c.y;
  if (fx * fx + fy * fy <= c.r * c.r) return true;
  const ex = x2 - c.x;
  const ey = y2 - c.y;
  if (ex * ex + ey * ey <= c.r * c.r) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = dx * dx + dy * dy;
  if (a === 0) return false;
  const b = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - c.r * c.r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return false;
  const root = Math.sqrt(disc);
  const t1 = (-b - root) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return true;
  const t2 = (-b + root) / (2 * a);
  return t2 >= 0 && t2 <= 1;
}

// True when any blocker stands between the two points.
export function segmentBlocked(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    const b = blockers[i];
    if (isRound(b)) {
      if (lineTouchesRound(x1, y1, x2, y2, b)) return true;
    } else if (lineTouchesRect(x1, y1, x2, y2, b)) {
      return true;
    }
  }
  return false;
}

// The signed smallest turn from angle b to angle a, in (-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can the eye at (ex, ey), facing `dir`, see the target at (tx, ty)?
// Returns the distance when seen, -1 when out of range, outside the
// cone, or hidden behind a blocker. A target closer than 26 px is seen
// in any direction — a guard feels someone breathing down his neck.
export function canSeeFrom(ex, ey, dir, tx, ty, blockers, range, halfAngle) {
  const dx = tx - ex;
  const dy = ty - ey;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return -1;
  if (dist > 26) {
    const bearing = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(bearing, dir)) > halfAngle) return -1;
  }
  if (segmentBlocked(ex, ey, tx, ty, blockers)) return -1;
  return dist;
}

// The visible fan of a cone from (ex, ey): twenty-six rays march out in
// 8 px steps and stop 4 px short of the first blocker each one meets.
export function conePolygon(ex, ey, dir, blockers, range, halfAngle) {
  const fan = [[ex, ey]];
  const RAYS = 26;
  const STEP = 8;
  for (let i = 0; i <= RAYS; i += 1) {
    const ang = dir - halfAngle + (2 * halfAngle * i) / RAYS;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    let reach = range;
    let s = STEP;
    while (s <= range) {
      if (pointInBlocker(ex + ux * s, ey + uy * s, blockers)) {
        reach = s - 4;
        break;
      }
      s += STEP;
    }
    fan.push([ex + ux * reach, ey + uy * reach]);
  }
  return fan;
}

// True when the point (x, y) sits inside any blocker.
export function pointInBlocker(x, y, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    const b = blockers[i];
    if (isRound(b)) {
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) return true;
    } else if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return true;
    }
  }
  return false;
}

// True when a circle of `radius` at (x, y) would overlap any blocker:
// circles against circles by centre distance, circles against rects by
// the nearest point of the rect.
function discOverlaps(x, y, radius, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    const b = blockers[i];
    if (isRound(b)) {
      const dx = x - b.x;
      const dy = y - b.y;
      const gap = radius + b.r;
      if (dx * dx + dy * dy < gap * gap) return true;
    } else {
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Slide a round body by (dx, dy), one axis at a time, so it can glide
// along a case's edge instead of sticking on its corner. The body stays
// inside the bounds, its radius clear of the edges.
export function moveCircle(e, dx, dy, blockers, bounds, radius) {
  if (dx !== 0) {
    const nx = e.x + dx;
    if (!discOverlaps(nx, e.y, radius, blockers)) e.x = nx;
  }
  if (dy !== 0) {
    const ny = e.y + dy;
    if (!discOverlaps(e.x, ny, radius, blockers)) e.y = ny;
  }
  const minX = bounds.x + radius;
  const maxX = bounds.x + bounds.w - radius;
  const minY = bounds.y + radius;
  const maxY = bounds.y + bounds.h - radius;
  if (e.x < minX) e.x = minX;
  else if (e.x > maxX) e.x = maxX;
  if (e.y < minY) e.y = minY;
  else if (e.y > maxY) e.y = maxY;
}
