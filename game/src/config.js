// Rampok Museum — tuning constants. One place for every number the
// simulation and the renderer agree on, so a balance change is one edit.

export const STEP = 1 / 60;

export const VIEW = { width: 1280, height: 720 };

export const FIELD = { x: 40, y: 60, width: 1200, height: 620 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 88,
  // While sneaking the player is half as loud and half as visible.
  sneakNoise: 0.5,
  sneakVisibility: 0.5,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  investigateSpeed: 105,
  chaseSpeed: 148,
  // Vision cone: half-angle and reach in pixels.
  coneHalfAngle: 0.42,
  coneRange: 250,
  // Detection fills 0..1 while the thief is inside a lit cone with a clear
  // line of sight. Rates are per second, scaled by distance and movement.
  detectBase: 0.85,
  detectClose: 1.9,
  detectRun: 1.35,
  detectDecay: 0.45,
  // A guard that loses the thief looks around, then goes back to patrol.
  lookAroundSeconds: 2.4,
  chaseGiveUpSeconds: 4,
  catchRadius: 24,
};

export const CAMERA = {
  range: 260,
  coneHalfAngle: 0.38,
  // Sweep: the camera pans between its two end angles.
  sweepSpeed: 0.55,
  // Being seen by a camera fills the alarm directly, per second.
  alarmFill: 16,
  disabledSeconds: 15,
};

export const ALARM = {
  // A full guard detection meter adds this much to the alarm.
  guardFull: 26,
  // Alarm decay per second while nobody sees the thief.
  decay: 1.6,
  // At 100 the museum locks down: escape before the countdown ends.
  lockdownSeconds: 30,
  // Being caught adds this much alarm on top of the life lost.
  caughtPenalty: 18,
};

export const LIVES = 3;

export const LOOT = {
  // Seconds the thief must stand by a case, holding E, to lift the piece.
  channelSeconds: 1.2,
  kerisValue: 5000,
  topengValue: 2200,
  vasValue: 1800,
  coinValue: 250,
};

export const THROW = {
  coins: 3,
  range: 300,
  // Guards within this radius of the landing coin go investigate it.
  hearRadius: 190,
};

export const SCORE = {
  lifeBonus: 400,
  // Time bonus per second left under the par time, once escaped.
  timeBonusPerSecond: 12,
  parSeconds: 240,
};

export const FUSE = {
  // One use only: kills every camera for CAMERA.disabledSeconds.
  uses: 1,
};
