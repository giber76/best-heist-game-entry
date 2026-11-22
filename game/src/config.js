// Every tuning number and colour for Midnight at the Marlowe, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
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
  floorA: '#171a26',
  floorB: '#1c2030',
  carpet: '#5e1a24',
  carpetEdge: '#8a6d2f',
  wall: '#2b3042',
  wallTop: '#3a415c',
  gold: '#d8a93b',
  goldBright: '#f2c94c',
  glass: '#9fd8e8',
  caseBase: '#232838',
  plant: '#2f6b4f',
  statue: '#8f97ad',
  crate: '#4a3a28',
  thief: '#111318',
  thiefTrim: '#e8e8f0',
  guard: '#2c4a7c',
  guardTrim: '#dfe8ff',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneHot: 'rgba(229, 83, 75, 0.30)',
  camCone: 'rgba(120, 200, 255, 0.16)',
  camConeHot: 'rgba(229, 83, 75, 0.28)',
  smoke: 'rgba(200, 205, 215, 0.35)',
  exit: '#3fae6a',
  exitGlow: 'rgba(63, 174, 106, 0.35)',
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
