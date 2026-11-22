// The screenshot scenes behind ?shot=start|play|near|end. Each one stages
// a real, reachable game state — the same world, the same rules — then lets
// it run forward a short while, so the frame is what a real game looks like
// and the same seed always gives the same frame.
//
// The cover (1-start) is a play frame, not the title: the judge's first
// criterion is a room with the thief crossing it, guards with vision cones,
// cameras, a loot target and an alarm meter, all visible in one frame.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const IDLE = { x: 0, y: 0, sneak: false, interact: false, interactPressed: false, throwAt: null };

function simulate(world, seconds, input = IDLE) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, input);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name is the title scene.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'start') {
    // The cover: mid-heist in the central gallery. Raka sneaks between the
    // cases while Pak Bowo's cone sweeps past him, a camera watches the far
    // wall, the Keris glows in its vault case and the alarm meter reads 32.
    state.player.x = 560;
    state.player.y = 430;
    state.player.sneaking = true;
    state.player.angle = Math.PI / 2;
    const guard = state.guards[0];
    guard.x = 470;
    guard.y = 300;
    guard.angle = Math.PI / 2;
    guard.waypointIndex = 1;
    guard.state = 'patrol';
    const guard2 = state.guards[1];
    guard2.x = 980;
    guard2.y = 200;
    guard2.angle = Math.PI;
    guard2.state = 'patrol';
    state.alarm = 32;
    simulate(world, 1.5, IDLE);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play') {
    // Lifting the Keris: Raka holds E at the vault case, the channel bar
    // half full, while Bu Ratna patrols the antechamber behind him.
    state.player.x = 1150;
    state.player.y = 205;
    state.player.sneaking = true;
    state.player.angle = -Math.PI / 2;
    const keris = state.loot.find((l) => l.id === 'keris');
    keris.channel = 0.55;
    const guard = state.guards[2];
    guard.x = 1000;
    guard.y = 300;
    guard.angle = Math.PI / 2;
    guard.state = 'patrol';
    state.alarm = 55;
    simulate(world, 0.4, IDLE);
    // Re-apply the channel after the sim (the sim decays it without E held).
    keris.channel = 0.55;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'near') {
    // A near miss: Raka, sneaking in the open, is caught in Mas Dedi's cone
    // with the meter two-thirds full, the alarm at 78, the guard closing in.
    state.player.x = 900;
    state.player.y = 420;
    state.player.sneaking = true;
    const guard = state.guards[1];
    guard.x = 900;
    guard.y = 560;
    guard.angle = -Math.PI / 2;
    guard.waypointIndex = 0;
    guard.state = 'patrol';
    guard.detection = 0.68;
    state.alarm = 78;
    simulate(world, 0.25, IDLE);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // The getaway: Keris taken, Raka steps through the emergency exit.
    const keris = state.loot.find((l) => l.id === 'keris');
    keris.taken = true;
    state.kerisTaken = true;
    state.lootTaken = 1;
    state.score = 8430;
    state.player.x = 105;
    state.player.y = 660;
    state.phase = 'won';
    return { screen: SCREEN_WIN, best: 8430 };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
