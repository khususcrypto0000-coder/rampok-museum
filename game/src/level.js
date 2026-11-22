// Rampok Museum — the floor plan. One museum floor, drawn as rectangles:
// walls block movement and sight, display cases are tall cover (they block
// both too), shadow zones are dark corners where no eye can fill detection.

import { FIELD, LOOT } from './config.js';

// Walls are {x, y, w, h}. The field edge is the outer wall.
export const WALLS = [
  // Outer shell.
  { x: FIELD.x, y: FIELD.y, w: FIELD.width, h: 8 },
  { x: FIELD.x, y: FIELD.y + FIELD.height - 8, w: FIELD.width, h: 8 },
  { x: FIELD.x, y: FIELD.y, w: 8, h: FIELD.height },
  { x: FIELD.x + FIELD.width - 8, y: FIELD.y, w: 8, h: FIELD.height },
  // Partition A: vertical, splits west/east wings; door gap y 400..470.
  { x: 620, y: FIELD.y, w: 20, h: 340 },
  { x: 620, y: 470, w: 20, h: 210 },
  // Partition B: horizontal, west wing; door gap x 520..600.
  { x: FIELD.x, y: 350, w: 480, h: 20 },
  // Partition C: vertical, east wing; door gap y 470..540.
  { x: 880, y: 370, w: 20, h: 100 },
  { x: 880, y: 540, w: 20, h: 140 },
  // Partition D: vault antechamber, top-right; door gap x 1000..1080.
  { x: 640, y: 210, w: 360, h: 20 },
  // Partition E: stub wall, west corridor.
  { x: 300, y: 500, w: 20, h: 180 },
];

// Display cases: {x, y, w, h, loot} — tall glass cases, solid cover.
export const CASES = [
  { x: 180, y: 120, w: 90, h: 50, loot: 'vas' },
  { x: 420, y: 150, w: 90, h: 50, loot: null },
  { x: 760, y: 140, w: 90, h: 50, loot: null },
  { x: 1000, y: 300, w: 90, h: 50, loot: 'topeng' },
  { x: 180, y: 420, w: 90, h: 50, loot: null },
  { x: 480, y: 520, w: 90, h: 50, loot: null },
  { x: 1080, y: 480, w: 90, h: 50, loot: null },
  { x: 760, y: 560, w: 90, h: 50, loot: null },
  { x: 1100, y: 110, w: 100, h: 60, loot: 'keris' },
];

// Dark corners: standing here, no cone can fill detection.
export const SHADOWS = [
  { x: 56, y: 76, w: 120, h: 90 },
  { x: 1120, y: 560, w: 104, h: 104 },
  { x: 656, y: 560, w: 110, h: 90 },
];

export const LOOT_DEFS = [
  { id: 'keris', name: 'Keris Pusaka', x: 1150, y: 140, value: LOOT.kerisValue, required: true },
  { id: 'topeng', name: 'Topeng Emas', x: 1045, y: 325, value: LOOT.topengValue, required: false },
  { id: 'vas', name: 'Vas Dinasti', x: 225, y: 145, value: LOOT.vasValue, required: false },
];

export const COIN_DEFS = [
  { x: 300, y: 600, value: LOOT.coinValue, taken: false },
  { x: 700, y: 120, value: LOOT.coinValue, taken: false },
  { x: 1150, y: 620, value: LOOT.coinValue, taken: false },
];

export const GUARD_DEFS = [
  {
    name: 'Pak Bowo',
    speed: 76,
    waypoints: [
      { x: 200, y: 300 },
      { x: 560, y: 300 },
      { x: 560, y: 600 },
      { x: 200, y: 600 },
    ],
  },
  {
    name: 'Mas Dedi',
    speed: 84,
    waypoints: [
      { x: 700, y: 140 },
      { x: 1180, y: 140 },
      { x: 1180, y: 600 },
      { x: 700, y: 600 },
    ],
  },
  {
    name: 'Bu Ratna',
    speed: 70,
    waypoints: [
      { x: 700, y: 280 },
      { x: 1180, y: 280 },
      { x: 1180, y: 480 },
      { x: 700, y: 480 },
    ],
  },
];

export const CAMERA_DEFS = [
  { x: 660, y: 80, baseAngle: Math.PI / 2, sweep: 0.7, name: 'Kamera A' },
  { x: 1228, y: 360, baseAngle: Math.PI, sweep: 0.6, name: 'Kamera B' },
  { x: 880, y: 668, baseAngle: -Math.PI / 2, sweep: 0.6, name: 'Kamera C' },
];

export const FUSE_BOX = { x: 656, y: 435 };

export const EXIT_ZONE = { x: 60, y: 640, w: 110, h: 40 };

export const SPAWN = { x: 105, y: 615 };

export const LEVEL = { walls: WALLS, cases: CASES, shadows: SHADOWS };

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function segmentHitsRect(x0, y0, x1, y1, r) {
  if (x0 >= r.x && x0 <= r.x + r.w && y0 >= r.y && y0 <= r.y + r.h) return true;
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  return (
    segmentsCross(x0, y0, x1, y1, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x0, y0, x1, y1, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x0, y0, x1, y1, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x0, y0, x1, y1, r.x, r.y + r.h, r.x, r.y)
  );
}

/** True when no wall or display case stands between the two points. */
export function hasLineOfSight(x0, y0, x1, y1, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x0, y0, x1, y1, r)) return false;
  }
  return true;
}

/** All solid things that block sight: walls plus display cases. */
export function sightBlockers() {
  return WALLS.concat(CASES);
}

function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

/** True when the circle overlaps any wall or display case. */
export function circleHitsSolid(cx, cy, radius) {
  for (const r of WALLS) if (circleHitsRect(cx, cy, radius, r)) return true;
  for (const r of CASES) if (circleHitsRect(cx, cy, radius, r)) return true;
  return false;
}

/** True when the point lies inside a wall or a display case. */
export function pointInSolid(x, y) {
  for (const r of WALLS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  for (const r of CASES) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** True when the point stands in a dark corner. */
export function pointInShadow(x, y) {
  for (const r of SHADOWS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** True when the point stands inside the exit zone. */
export function pointInExit(x, y) {
  return x >= EXIT_ZONE.x && x <= EXIT_ZONE.x + EXIT_ZONE.w && y >= EXIT_ZONE.y && y <= EXIT_ZONE.y + EXIT_ZONE.h;
}
