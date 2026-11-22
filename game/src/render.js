// Rampok Museum — the renderer. Draws the museum, the thief, the guards
// and their vision cones, the cameras, the loot and the HUD on one canvas.
// Vision cones are raycast: each ray marches out until a wall or a display
// case stops it, so cones bend around cover exactly like the simulation's
// line of sight does.

import { ALARM, CAMERA, FIELD, GUARD, VIEW } from './config.js';
import { CASES, EXIT_ZONE, FUSE_BOX, SHADOWS, WALLS } from './level.js';
import { GUARD_CHASE, GUARD_INVESTIGATE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const CONE_RAYS = 26;
const MARCH_STEP = 6;

function pointInSolid(x, y) {
  for (const r of WALLS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  for (const r of CASES) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function rayReach(x, y, angle, range) {
  let d = MARCH_STEP;
  while (d < range) {
    if (pointInSolid(x + Math.cos(angle) * d, y + Math.sin(angle) * d)) return d - MARCH_STEP;
    d += MARCH_STEP;
  }
  return range;
}

/** The cone polygon for a watcher at (x, y) facing `angle`. */
export function conePolygon(x, y, angle, halfAngle, range) {
  const points = [{ x, y }];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / CONE_RAYS;
    const reach = rayReach(x, y, a, range);
    points.push({ x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach });
  }
  return points;
}

function drawCone(ctx, x, y, angle, halfAngle, range, color) {
  const poly = conePolygon(x, y, angle, halfAngle, range);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx) {
  ctx.fillStyle = '#1b2230';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Marble checker, two close tones.
  const tile = 40;
  for (let ty = FIELD.y; ty < FIELD.y + FIELD.height; ty += tile) {
    for (let tx = FIELD.x; tx < FIELD.x + FIELD.width; tx += tile) {
      const even = ((tx - FIELD.x) / tile + (ty - FIELD.y) / tile) % 2 === 0;
      ctx.fillStyle = even ? '#232c3d' : '#202839';
      ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // Warm spotlight pools over the display cases.
  for (const c of CASES) {
    const g = ctx.createRadialGradient(
      c.x + c.w / 2, c.y + c.h / 2, 8,
      c.x + c.w / 2, c.y + c.h / 2, 130,
    );
    g.addColorStop(0, 'rgba(255, 214, 120, 0.10)');
    g.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 130, c.y - 130, c.w + 260, c.h + 260);
  }
}

function drawWallsAndCases(ctx, state) {
  for (const w of WALLS) {
    ctx.fillStyle = '#39445a';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#4a5872';
    ctx.fillRect(w.x, w.y, w.w, 2);
  }
  for (const c of CASES) {
    ctx.fillStyle = '#2c3a52';
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#7d8aa5';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glass sheen.
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(c.x + 10, c.y + c.h - 8);
    ctx.lineTo(c.x + c.w - 14, c.y + 8);
    ctx.stroke();
  }
  // Shadow zones: dark corners, drawn as a soft gloom. Label sits at the
  // top edge so it never collides with a coin or a case inside the zone.
  for (const s of SHADOWS) {
    ctx.fillStyle = 'rgba(4, 6, 12, 0.55)';
    roundRect(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(140, 160, 200, 0.55)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BAYANGAN', s.x + s.w / 2, s.y + 15);
  }
  // Exit zone.
  ctx.fillStyle = '#1d5c33';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = '#37d67a';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = '#8dffb8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PINTU DARURAT', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + EXIT_ZONE.h / 2 + 4);
  // Fuse box.
  ctx.fillStyle = '#8a6d1f';
  ctx.fillRect(FUSE_BOX.x - 10, FUSE_BOX.y - 14, 20, 28);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(FUSE_BOX.x - 10, FUSE_BOX.y - 14, 20, 28);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('LISTRIK', FUSE_BOX.x, FUSE_BOX.y - 20);
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3 + item.x);
    ctx.fillStyle = `rgba(255, 200, 60, ${0.25 + 0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◆', item.x, item.y + 5);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(item.name.toUpperCase(), item.x, item.y - 32);
    if (item.channel > 0) {
      ctx.fillStyle = '#20242e';
      ctx.fillRect(item.x - 26, item.y + 16, 52, 7);
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(item.x - 26, item.y + 16, 52 * item.channel, 7);
    }
  }
  for (const coin of state.coins) {
    if (coin.taken) continue;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d1f';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const mark of state.coinMarks) {
    ctx.globalAlpha = Math.min(1, mark.ttl);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawGuard(ctx, guard) {
  const chasing = guard.state === GUARD_CHASE;
  const investigating = guard.state === GUARD_INVESTIGATE;
  const coneColor = chasing
    ? 'rgba(255, 60, 60, 0.30)'
    : investigating
      ? 'rgba(255, 180, 60, 0.24)'
      : 'rgba(255, 220, 110, 0.20)';
  drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.coneHalfAngle, GUARD.coneRange, coneColor);
  // Body: navy uniform, cap, flashlight dot.
  ctx.fillStyle = '#22355e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7d9bd6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#dfe8ff';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // Detection arc above the guard.
  if (guard.detection > 0.03) {
    ctx.strokeStyle = guard.detection > 0.7 ? '#ff5040' : '#ffd23e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
    ctx.stroke();
  }
  ctx.fillStyle = '#cfe0ff';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name, guard.x, guard.y - 22);
}

function drawCamera(ctx, cam, time) {
  const disabled = cam.disabledTimer > 0;
  const color = disabled ? 'rgba(120, 130, 150, 0.10)' : 'rgba(255, 70, 70, 0.22)';
  drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.coneHalfAngle, CAMERA.range, color);
  ctx.fillStyle = disabled ? '#5a6478' : '#3a3f4a';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = disabled ? '#8a94a8' : '#ff5040';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Blinking recording dot, driven by the world clock so a staged frame is
  // always the same pixels.
  if (!disabled) {
    const blink = Math.sin(time * 4) > 0;
    ctx.fillStyle = blink ? '#ff2e2e' : '#7a1d1d';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 12, cam.y + Math.sin(cam.angle) * 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb3b3';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(disabled ? 'MATI' : cam.name.toUpperCase(), cam.x, cam.y - 14);
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // Sneak ring: a quiet circle while sneaking.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#11141c';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point + eyes facing the movement direction.
  const fx = Math.cos(p.angle);
  const fy = Math.sin(p.angle);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(p.x + fx * 9, p.y + fy * 9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RAKA', p.x, p.y - 20);
}

function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(8, 10, 16, 0.92)';
  ctx.fillRect(0, 0, VIEW.width, 52);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RAMPOK MUSEUM', 16, 33);
  // Alarm meter: the one number that decides a lockdown.
  const ax = 230;
  const aw = 340;
  ctx.fillStyle = '#20242e';
  roundRect(ctx, ax, 16, aw, 20, 10);
  ctx.fill();
  const alarmRatio = state.alarm / 100;
  ctx.fillStyle = state.lockdown ? '#ff2e2e' : alarmRatio > 0.6 ? '#ff7a2e' : '#ffc93e';
  if (alarmRatio > 0) {
    roundRect(ctx, ax, 16, aw * alarmRatio, 20, 10);
    ctx.fill();
  }
  ctx.strokeStyle = '#8a94a8';
  ctx.lineWidth = 1.5;
  roundRect(ctx, ax, 16, aw, 20, 10);
  ctx.stroke();
  ctx.fillStyle = state.lockdown ? '#ff6b6b' : '#e8ecff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.lockdown ? `ALARM ${Math.ceil(state.lockdownTimer)}s` : 'ALARM', ax + aw + 12, 32);
  // Lives.
  ctx.fillStyle = '#ff6b81';
  ctx.font = 'bold 15px sans-serif';
  let hearts = '';
  for (let i = 0; i < state.lives; i += 1) hearts += '♥ ';
  ctx.fillText(hearts.trim(), 640, 33);
  // Score + loot + coins + fuse.
  ctx.fillStyle = '#e8ecff';
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`SKOR ${state.score}`, 1264, 33);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#ffd23e';
  const lootText = state.loot.map((l) => (l.taken ? '◆' : '◇')).join(' ');
  ctx.fillText(`LOOT ${lootText}   KOIN LEMPAR ${state.throwCoins}   LISTRIK ${state.fuseUses}x`, 1264, 48);
  ctx.textAlign = 'left';
  // Bottom hint.
  ctx.fillStyle = 'rgba(232, 236, 255, 0.65)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD/Arrows gerak · Shift ngendap · E ambil loot / matiin listrik · Klik lempar koin · P jeda · M suara', 16, 706);
  // Lockdown banner.
  if (state.lockdown && state.phase === 'playing') {
    ctx.fillStyle = 'rgba(255, 46, 46, 0.16)';
    ctx.fillRect(0, 52, VIEW.width, VIEW.height - 52);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LOCKDOWN! KABUR DALAM ${Math.ceil(state.lockdownTimer)} DETIK!`, VIEW.width / 2, 92);
    ctx.textAlign = 'left';
  }
}

function drawTitle(ctx, best) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('RAMPOK MUSEUM', VIEW.width / 2, 250);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Museum Pusaka Nusantara, tengah malam. Ambil Keris Pusaka-nya,', VIEW.width / 2, 300);
  ctx.fillText('lewati penjaga dan kameranya, lalu kabur lewat pintu darurat.', VIEW.width / 2, 330);
  ctx.fillStyle = '#9fb2d8';
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / Panah — gerak      Shift — ngendap      E — ambil loot / matiin listrik', VIEW.width / 2, 400);
  ctx.fillText('Klik — lempar koin pengalih      P — jeda      M — suara', VIEW.width / 2, 428);
  if (best > 0) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Skor terbaik: ${best}`, VIEW.width / 2, 470);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Tekan SPASI untuk mulai', VIEW.width / 2, 530);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, won, best) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#37d67a' : '#ff6b6b';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(won ? 'LOLOS!' : state.loseReason === 'lockdown' ? 'LOCKDOWN!' : 'KETANGKAP!', VIEW.width / 2, 260);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '19px sans-serif';
  ctx.fillText(
    won
      ? 'Keris Pusaka berhasil dibawa kabur. Raka menghilang ke dalam malam.'
      : state.loseReason === 'lockdown'
        ? 'Pintu terkunci sebelum Raka sempat kabur. Polisi sudah di depan museum.'
        : 'Penjaga menangkap Raka di tempat. Aksi malam ini gagal.',
    VIEW.width / 2, 310,
  );
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`SKOR ${state.score}   ·   Loot ${state.lootTaken}/3`, VIEW.width / 2, 370);
  if (best > 0) {
    ctx.fillStyle = '#9fb2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Skor terbaik: ${best}`, VIEW.width / 2, 402);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Tekan R untuk main lagi', VIEW.width / 2, 470);
  ctx.textAlign = 'left';
}

/** Draw the whole frame for the given screen. */
export function draw(ctx, world, screen, best) {
  const state = world.state;
  drawFloor(ctx);
  drawWallsAndCases(ctx, state);
  drawLoot(ctx, state);
  for (const cam of state.cameras) drawCamera(ctx, cam, state.time);
  for (const guard of state.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  if (screen === SCREEN_TITLE) drawTitle(ctx, best);
  if (screen === SCREEN_WIN) drawEnd(ctx, state, true, best);
  if (screen === SCREEN_OVER) drawEnd(ctx, state, false, best);
}
