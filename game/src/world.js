// Rampok Museum — the simulation. Pure logic, no DOM: a Node test harness
// can drive it headlessly. The world advances in fixed 1/60 s steps.
//
// Guards have three minds: patrol (walk the waypoints), investigate (walk to
// a sound or a glimpse, look around), chase (run at the thief). A guard's
// detection meter fills while the thief stands inside its lit cone with a
// clear line of sight — faster up close and while running, slower while
// sneaking, never in a shadow zone. A full meter raises the alarm and the
// guard gives chase. Cameras sweep their own cones and fill the alarm
// directly. At alarm 100 the museum locks down and the thief has 30 seconds
// to get out. The Keris Pusaka must be lifted (hold E by its case) and the
// thief must reach the emergency exit to win.

import {
  ALARM,
  CAMERA,
  FIELD,
  FUSE,
  GUARD,
  LIVES,
  LOOT,
  PLAYER,
  SCORE,
  STEP,
  THROW,
} from './config.js';
import {
  CAMERA_DEFS,
  COIN_DEFS,
  EXIT_ZONE,
  FUSE_BOX,
  GUARD_DEFS,
  LOOT_DEFS,
  SPAWN,
  circleHitsSolid,
  hasLineOfSight,
  pointInExit,
  pointInShadow,
  sightBlockers,
} from './level.js';

export const EVENT_CAUGHT = 'caught';
export const EVENT_WIN = 'win';
export const EVENT_LOSE = 'lose';
export const EVENT_PICKUP = 'pickup';
export const EVENT_ALARM = 'alarm';
export const EVENT_THROW = 'throw';
export const EVENT_FUSE = 'fuse';
export const EVENT_LOCKDOWN = 'lockdown';

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(x0, y0, x1, y1) {
  return Math.hypot(x1 - x0, y1 - y0);
}

function createGuard(def) {
  const first = def.waypoints[0];
  const second = def.waypoints[1] ?? first;
  return {
    name: def.name,
    waypoints: def.waypoints,
    speed: def.speed,
    x: first.x,
    y: first.y,
    angle: angleTo(first.x, first.y, second.x, second.y),
    waypointIndex: 1 % def.waypoints.length,
    state: GUARD_PATROL,
    target: null,
    lookTimer: 0,
    chaseTimer: 0,
    detection: 0,
  };
}

function createCamera(def) {
  return {
    name: def.name,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    angle: def.baseAngle,
    phase: 0,
    disabledTimer: 0,
  };
}

/** A fresh museum, thief at the entrance, guards on patrol, alarm at zero. */
export function createWorld(random) {
  const state = {
    random: random ?? Math.random,
    time: 0,
    phase: 'playing',
    loseReason: null,
    player: { x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, sneaking: false, moving: false },
    guards: GUARD_DEFS.map(createGuard),
    cameras: CAMERA_DEFS.map(createCamera),
    loot: LOOT_DEFS.map((d) => ({ ...d, taken: false, channel: 0 })),
    coins: COIN_DEFS.map((c) => ({ ...c, taken: false })),
    coinMarks: [],
    alarm: 0,
    lockdown: false,
    lockdownTimer: 0,
    lives: LIVES,
    score: 0,
    throwCoins: THROW.coins,
    fuseUses: FUSE.uses,
    kerisTaken: false,
    lootTaken: 0,
  };
  return { state, events: [], step, reset };
}

/** Reset the world to its fresh state (same object, new run). */
function reset() {
  const fresh = createWorld(this.state.random);
  this.state = fresh.state;
  this.events = [];
}

function moveCircle(state, body, dx, dy, radius) {
  const nx = body.x + dx;
  if (!circleHitsSolid(nx, body.y, radius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolid(body.x, ny, radius)) body.y = ny;
  body.x = clamp(body.x, FIELD.x + radius, FIELD.x + FIELD.width - radius);
  body.y = clamp(body.y, FIELD.y + radius, FIELD.y + FIELD.height - radius);
}

function guardSeesPlayer(state, guard) {
  const p = state.player;
  const d = dist(guard.x, guard.y, p.x, p.y);
  if (d > GUARD.coneRange) return 0;
  if (Math.abs(angleDiff(angleTo(guard.x, guard.y, p.x, p.y), guard.angle)) > GUARD.coneHalfAngle) return 0;
  if (pointInShadow(p.x, p.y)) return 0;
  if (!hasLineOfSight(guard.x, guard.y, p.x, p.y, sightBlockers())) return 0;
  // Closeness and movement scale the fill rate.
  let rate = GUARD.detectBase;
  if (d < 120) rate = GUARD.detectClose;
  if (p.moving && !p.sneaking) rate *= GUARD.detectRun;
  if (p.sneaking) rate *= PLAYER.sneakVisibility;
  return rate;
}

function cameraSeesPlayer(state, camera) {
  if (camera.disabledTimer > 0) return false;
  const p = state.player;
  const d = dist(camera.x, camera.y, p.x, p.y);
  if (d > CAMERA.range) return false;
  if (Math.abs(angleDiff(angleTo(camera.x, camera.y, p.x, p.y), camera.angle)) > CAMERA.coneHalfAngle) return false;
  if (pointInShadow(p.x, p.y)) return false;
  return hasLineOfSight(camera.x, camera.y, p.x, p.y, sightBlockers());
}

function raiseAlarm(state, amount, events) {
  if (state.lockdown) return;
  state.alarm = Math.min(100, state.alarm + amount);
  if (state.alarm >= 100) {
    state.lockdown = true;
    state.lockdownTimer = ALARM.lockdownSeconds;
    events.push(EVENT_LOCKDOWN);
  }
}

function respawnAfterCaught(world) {
  const state = world.state;
  state.lives -= 1;
  state.alarm = Math.min(100, state.alarm + ALARM.caughtPenalty);
  if (state.lives <= 0) {
    state.phase = 'lost';
    state.loseReason = 'caught';
    world.events.push(EVENT_LOSE);
    return;
  }
  state.player.x = SPAWN.x;
  state.player.y = SPAWN.y;
  state.player.angle = -Math.PI / 2;
  for (const g of state.guards) {
    const first = g.waypoints[0];
    const second = g.waypoints[1] ?? first;
    g.x = first.x;
    g.y = first.y;
    g.angle = angleTo(first.x, first.y, second.x, second.y);
    g.waypointIndex = 1 % g.waypoints.length;
    g.state = GUARD_PATROL;
    g.target = null;
    g.detection = 0;
    g.chaseTimer = 0;
  }
  world.events.push(EVENT_CAUGHT);
}

function stepGuard(world, guard, dt, events) {
  const state = world.state;
  const p = state.player;
  const seen = guardSeesPlayer(state, guard);
  if (seen > 0) {
    guard.detection = Math.min(1, guard.detection + seen * dt);
    if (guard.detection >= 1) {
      guard.detection = 0;
      guard.state = GUARD_CHASE;
      guard.chaseTimer = GUARD.chaseGiveUpSeconds;
      raiseAlarm(state, ALARM.guardFull, events);
      events.push(EVENT_ALARM);
    }
  } else {
    guard.detection = Math.max(0, guard.detection - GUARD.detectDecay * dt);
  }

  if (guard.state === GUARD_CHASE) {
    guard.chaseTimer = seen > 0 ? GUARD.chaseGiveUpSeconds : guard.chaseTimer - dt;
    guard.angle = angleTo(guard.x, guard.y, p.x, p.y);
    const d = dist(guard.x, guard.y, p.x, p.y);
    if (d > GUARD.catchRadius) {
      const stepLen = GUARD.chaseSpeed * dt;
      moveCircle(state, guard, Math.cos(guard.angle) * stepLen, Math.sin(guard.angle) * stepLen, GUARD.radius);
    } else {
      respawnAfterCaught(world);
      return;
    }
    if (guard.chaseTimer <= 0) {
      guard.state = GUARD_INVESTIGATE;
      guard.target = { x: p.x, y: p.y };
    }
    return;
  }

  if (guard.state === GUARD_INVESTIGATE) {
    const target = guard.target ?? guard.waypoints[guard.waypointIndex];
    const d = dist(guard.x, guard.y, target.x, target.y);
    if (d > 6) {
      guard.angle = angleTo(guard.x, guard.y, target.x, target.y);
      const stepLen = GUARD.investigateSpeed * dt;
      moveCircle(state, guard, Math.cos(guard.angle) * stepLen, Math.sin(guard.angle) * stepLen, GUARD.radius);
    } else if (guard.lookTimer <= 0) {
      guard.lookTimer = GUARD.lookAroundSeconds;
    } else {
      guard.lookTimer -= dt;
      guard.angle += dt * 1.2;
      if (guard.lookTimer <= 0) {
        guard.state = GUARD_PATROL;
        guard.target = null;
      }
    }
    return;
  }

  // Patrol: walk the waypoints.
  const wp = guard.waypoints[guard.waypointIndex];
  const d = dist(guard.x, guard.y, wp.x, wp.y);
  if (d < 6) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
  } else {
    guard.angle = angleTo(guard.x, guard.y, wp.x, wp.y);
    const stepLen = guard.speed * dt;
    moveCircle(state, guard, Math.cos(guard.angle) * stepLen, Math.sin(guard.angle) * stepLen, GUARD.radius);
  }
}

function step(dt, input) {
  const world = this;
  const state = world.state;
  world.events = [];
  const events = world.events;
  if (state.phase !== 'playing') return events;
  state.time += dt;
  const p = state.player;

  // --- thief movement ------------------------------------------------------
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const mx = input.x ?? 0;
  const my = input.y ?? 0;
  p.moving = mx !== 0 || my !== 0;
  p.sneaking = Boolean(input.sneak);
  if (p.moving) {
    const len = Math.hypot(mx, my) || 1;
    p.angle = Math.atan2(my / len, mx / len);
    moveCircle(state, p, (mx / len) * speed * dt, (my / len) * speed * dt, PLAYER.radius);
  }

  // --- thrown coin: a clang that pulls guards ------------------------------
  if (input.throwAt && state.throwCoins > 0) {
    const tx = clamp(input.throwAt.x, FIELD.x, FIELD.x + FIELD.width);
    const ty = clamp(input.throwAt.y, FIELD.y, FIELD.y + FIELD.height);
    const d = dist(p.x, p.y, tx, ty);
    if (d <= THROW.range) {
      state.throwCoins -= 1;
      state.coinMarks.push({ x: tx, y: ty, ttl: 1.6 });
      for (const g of state.guards) {
        if (dist(g.x, g.y, tx, ty) <= THROW.hearRadius && g.state !== GUARD_CHASE) {
          g.state = GUARD_INVESTIGATE;
          g.target = { x: tx, y: ty };
          g.lookTimer = 0;
        }
      }
      events.push(EVENT_THROW);
    }
  }
  for (const mark of state.coinMarks) mark.ttl -= dt;
  state.coinMarks = state.coinMarks.filter((m) => m.ttl > 0);

  // --- fuse box: one use, kills every camera for a while -------------------
  const nearFuse = dist(p.x, p.y, FUSE_BOX.x, FUSE_BOX.y) < 46;
  if (input.interactPressed && nearFuse && state.fuseUses > 0) {
    state.fuseUses -= 1;
    for (const cam of state.cameras) cam.disabledTimer = CAMERA.disabledSeconds;
    events.push(EVENT_FUSE);
  }

  // --- loot: hold E by a case to lift the piece ----------------------------
  let channeling = null;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = dist(p.x, p.y, item.x, item.y);
    if (d < 52 && input.interact) {
      channeling = item;
      item.channel = Math.min(1, item.channel + dt / LOOT.channelSeconds);
      if (item.channel >= 1) {
        item.taken = true;
        state.score += item.value;
        state.lootTaken += 1;
        if (item.id === 'keris') state.kerisTaken = true;
        events.push(EVENT_PICKUP);
      }
    } else {
      item.channel = Math.max(0, item.channel - dt / LOOT.channelSeconds);
    }
  }

  // --- loose coins: touch to pocket ----------------------------------------
  for (const coin of state.coins) {
    if (!coin.taken && dist(p.x, p.y, coin.x, coin.y) < 24) {
      coin.taken = true;
      state.score += coin.value;
      events.push(EVENT_PICKUP);
    }
  }

  // --- cameras sweep and watch ----------------------------------------------
  let cameraWatching = false;
  for (const cam of state.cameras) {
    cam.phase += dt * CAMERA.sweepSpeed;
    cam.angle = cam.baseAngle + Math.sin(cam.phase) * cam.sweep;
    if (cam.disabledTimer > 0) cam.disabledTimer -= dt;
    if (cameraSeesPlayer(state, cam)) {
      cameraWatching = true;
      raiseAlarm(state, CAMERA.alarmFill * dt, events);
    }
  }

  // --- guards ----------------------------------------------------------------
  for (const g of state.guards) {
    stepGuard(world, g, dt, events);
    if (state.phase !== 'playing') return events;
  }

  // --- alarm decay while unseen ----------------------------------------------
  if (!cameraWatching && !state.lockdown) {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
  }

  // --- lockdown countdown ------------------------------------------------------
  if (state.lockdown) {
    state.lockdownTimer -= dt;
    if (state.lockdownTimer <= 0) {
      state.phase = 'lost';
      state.loseReason = 'lockdown';
      events.push(EVENT_LOSE);
      return events;
    }
  }

  // --- escape ------------------------------------------------------------------
  if (state.kerisTaken && pointInExit(p.x, p.y)) {
    state.phase = 'won';
    const timeBonus = Math.max(0, SCORE.parSeconds - state.time) * SCORE.timeBonusPerSecond;
    state.score += Math.round(timeBonus) + state.lives * SCORE.lifeBonus;
    events.push(EVENT_WIN);
  }

  return events;
}

export { STEP };
