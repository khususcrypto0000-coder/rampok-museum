// Rampok Museum — the game loop. Wires the world, the renderer, the
// input and the sound together; runs the simulation in fixed 1/60 s steps
// and draws every animation frame. With ?shot=start|play|near|end in the
// URL it stages one deterministic screenshot scene instead of playing.

import { STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { draw, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { consumeInput, createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const audio = createAudio();
const input = createInput(canvas);

let best = 0;
try {
  best = Number(window.localStorage.getItem('rampok-museum-best') ?? 0) || 0;
} catch {
  best = 0;
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

let world = createWorld(createRandom(seed));
let screen = SCREEN_TITLE;
let paused = false;
let lastTime = 0;
let accumulator = 0;

function saveBest() {
  try {
    window.localStorage.setItem('rampok-museum-best', String(best));
  } catch {
    // Storage unavailable; the best score just lives for this session.
  }
}

function startGame() {
  world = createWorld(createRandom(seed));
  screen = SCREEN_PLAY;
  paused = false;
  audio.unlock();
}

function finishGame(won) {
  screen = won ? SCREEN_WIN : SCREEN_OVER;
  if (world.state.score > best) {
    best = world.state.score;
    saveBest();
  }
  audio.stopAlarm();
  if (won) audio.win();
  else audio.lose();
}

function handleEvents(events) {
  for (const event of events) {
    if (event === 'pickup') audio.pickup();
    if (event === 'throw') audio.throwCoin();
    if (event === 'fuse') audio.fuse();
    if (event === 'alarm') audio.alarm();
    if (event === 'caught') audio.caught();
    if (event === 'win') finishGame(true);
    if (event === 'lose') finishGame(false);
  }
  if (world.state.lockdown && world.state.phase === 'playing') audio.startAlarm();
  else audio.stopAlarm();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === ' ' && screen === SCREEN_TITLE) {
    event.preventDefault();
    startGame();
  } else if (key === 'r' && (screen === SCREEN_WIN || screen === SCREEN_OVER)) {
    startGame();
  } else if (key === 'p' && screen === SCREEN_PLAY) {
    paused = !paused;
  } else if (key === 'm') {
    audio.toggleMute();
  }
});

canvas.addEventListener('mousedown', () => audio.unlock());

function frame(time) {
  requestAnimationFrame(frame);
  if (screen !== SCREEN_PLAY || paused) {
    draw(ctx, world, screen, best);
    if (paused && screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(5, 7, 12, 0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JEDA — tekan P untuk lanjut', VIEW.width / 2, VIEW.height / 2);
      ctx.textAlign = 'left';
    }
    lastTime = time;
    return;
  }
  if (!lastTime) lastTime = time;
  let delta = (time - lastTime) / 1000;
  lastTime = time;
  if (delta > 0.25) delta = 0.25;
  accumulator += delta;
  while (accumulator >= STEP) {
    const events = world.step(STEP, consumeInput(input));
    handleEvents(events);
    accumulator -= STEP;
    if (world.state.phase !== 'playing') break;
  }
  draw(ctx, world, screen, best);
}

// Debug handle for the automated playtest (and nothing else): the current
// screen, whether the game is paused, the live world state, and the coins
// left to throw.
window.__game = {
  get screen() {
    return paused ? 'paused' : screen;
  },
  get paused() {
    return paused;
  },
  get state() {
    return world.state;
  },
  get coinsLeft() {
    return world.state.throwCoins;
  },
};

if (shotName) {
  // Screenshot mode: stage the scene, draw it once, signal readiness.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  if (staged.best) best = staged.best;
  draw(ctx, world, screen, best);
  window.__shotReady = true;
} else {
  draw(ctx, world, screen, best);
  requestAnimationFrame(frame);
}
