// Every tuning number and colour for Midnight at the Marlowe, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
//
// v2: the mechanics (speeds, radii, ranges, rates) are byte-identical to v1 —
// only the look changed. The thief and guards are drawn larger than their
// collision circles (visual radius vs radius) so the figures read at a glance
// on the dark floor without changing how the game plays.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  /** Drawn figure size: bigger than the hitbox so the thief is unmistakable. */
  visual: 19,
  walkSpeed: 195,
  sneakSpeed: 95,
  runSpeed: 250,
  // Detection rate multiplier while sneaking vs walking vs running.
  sneakSeen: 0.45,
  walkSeen: 1.0,
  runSeen: 1.7,
};

export const GUARD = {
  radius: 14,
  /** Drawn figure size: bigger than the hitbox so the patrol reads clearly. */
  visual: 17,
  patrolSpeed: 62,
  investigateSpeed: 105,
  chaseSpeed: 165,
  coneRange: 235,
  coneHalfAngle: 0.61, // ~35 degrees each side
  // Suspicion gained per second of clear sight, and lost per second unseen.
  seeRate: 0.7,
  loseRate: 0.3,
  // At suspicion 1 the guard chases; the chase itself raises the alarm.
  chaseAlarmRate: 20,
  hearRadius: 170,
};

export const CAMERA = {
  range: 265,
  coneHalfAngle: 0.44, // ~25 degrees each side
  seeRate: 1.15,
  alarmRate: 30,
};

export const ALARM = {
  max: 100,
  decayPerSecond: 7,
  // Alarm gained per second while any eye is on the thief, scaled by suspicion.
  spotRate: 22,
  // Score bonus when a level ends with the alarm never passing this line.
  ghostLine: 25,
  ghostBonus: 250,
};

export const TOOLS = {
  coinsPerLevel: 3,
  coinThrowRange: 300,
  coinNoiseRadius: 190,
  smokePerLevel: 2,
  smokeSeconds: 5,
  smokeRadius: 115,
  lockpickSeconds: 2.5,
  vaultLockpickSeconds: 4,
};

export const PALETTE = {
  backdrop: '#0b0e16',
  // Gallery floor: dark walnut planks, not a flat checkerboard.
  floorA: '#241c14',
  floorB: '#2b2218',
  floorLine: '#171208',
  // Central rug under the loot case, deep red with a gold border.
  rug: '#4a1620',
  rugEdge: '#c9a227',
  // The carpet runner across the middle, a walkway with a gold border.
  carpet: '#6b1f2a',
  carpetEdge: '#c9a227',
  wall: '#2b3042',
  wallTop: '#3a415c',
  gold: '#d8a93b',
  goldBright: '#f2c94c',
  glass: '#9fd8e8',
  caseBase: '#232838',
  plant: '#2f6b4f',
  statue: '#8f97ad',
  crate: '#4a3a28',
  // The thief: near-black body, a bright gold rim and a soft glow so the
  // figure pops on the dark floor.
  thief: '#111318',
  thiefTrim: '#e8e8f0',
  thiefRim: '#ffd34d',
  thiefGlow: 'rgba(255, 211, 77, 0.22)',
  guard: '#2c4a7c',
  guardTrim: '#dfe8ff',
  guardCap: '#1d3357',
  // Vision cones: warm amber for guards, cool cyan for cameras, saturated
  // enough to read as light, with a bright edge so the boundary is clear.
  cone: 'rgba(255, 190, 60, 0.34)',
  coneEdge: 'rgba(255, 214, 110, 0.55)',
  coneHot: 'rgba(255, 70, 55, 0.42)',
  coneHotEdge: 'rgba(255, 120, 100, 0.7)',
  camCone: 'rgba(90, 190, 255, 0.30)',
  camConeEdge: 'rgba(150, 215, 255, 0.5)',
  camConeHot: 'rgba(255, 70, 55, 0.40)',
  camConeHotEdge: 'rgba(255, 120, 100, 0.7)',
  smoke: 'rgba(200, 205, 215, 0.35)',
  exit: '#3fae6a',
  exitGlow: 'rgba(63, 174, 106, 0.35)',
  exitSign: '#d7ffe6',
  loot: '#f2c94c',
  lootGlow: 'rgba(242, 201, 76, 0.45)',
  panel: '#141824',
  panelEdge: '#2e3550',
  text: '#eef1f5',
  muted: '#9aa2b5',
  alarmLow: '#3fae6a',
  alarmMid: '#e8a13c',
  alarmHigh: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-marlowe.best';
