// The three jobs of the night. Each level is one room the thief crosses: its
// walls, its cover (crates, statues, plants, display cases), its patrols, its
// cameras, the loot and the way out. Cover blocks movement; only the tall
// kinds (walls, statues, crates) block a line of sight — low glass cases do not,
// and plants are decoration that never blocks movement. Every patrol route was
// checked against the walls and cover so a guard never walks through one.
// Every level offers three routes: a north lane, a middle lane and a south lane.
function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'JOB 1 — THE MARLOWE GALLERY',
    brief: 'Lift the Star Sapphire from the centre case, then slip out the east door.',
    loot: { x: 640, y: 205, name: 'Star Sapphire', value: 500, lockSeconds: 2 },
    exit: { ...rect(1208, 320, 48, 80), label: 'EAST DOOR' },
    start: { x: 72, y: 360 },
    parSeconds: 75,
    alarmDecay: 7,
    walls: [
      rect(420, 96, 24, 114),
      rect(836, 414, 24, 210),
      rect(520, 470, 240, 24),
    ],
    covers: [
      { ...rect(300, 160, 44, 44), kind: 'statue', sight: true },
      { ...rect(936, 160, 44, 44), kind: 'statue', sight: true },
      { ...rect(300, 516, 44, 44), kind: 'statue', sight: true },
      { ...rect(936, 516, 44, 44), kind: 'statue', sight: true },
      { ...rect(560, 560, 76, 52), kind: 'crate', sight: true },
      { ...rect(700, 560, 76, 52), kind: 'crate', sight: true },
      { ...rect(150, 110, 38, 38), kind: 'plant', sight: false },
      { ...rect(1092, 572, 38, 38), kind: 'plant', sight: false },
      { ...rect(595, 175, 90, 60), kind: 'case', sight: false },
    ],
    guards: [
      // North loop, watching the Sapphire's side of the room.
      { waypoints: [{ x: 500, y: 120 }, { x: 1100, y: 120 }, { x: 1100, y: 300 }, { x: 500, y: 300 }], phase: 0 },
      // South loop, watching the crates and the carpet — the middle lane stays open.
      { waypoints: [{ x: 180, y: 440 }, { x: 800, y: 440 }, { x: 800, y: 660 }, { x: 180, y: 660 }], phase: 0.5 },
    ],
    cameras: [
      { x: 64, y: 64, baseAngle: 0.7, sweep: 0.55, speed: 0.5 },
      { x: 1216, y: 656, baseAngle: Math.PI + 0.7, sweep: 0.55, speed: 0.42 },
    ],
    carpet: [rect(60, 330, 1160, 60)],
  },
  {
    name: 'JOB 2 — THE VAULT',
    brief: 'The Golden Idol sits behind the vault door. Pick it, grab it, leave west.',
    loot: { x: 1090, y: 150, name: 'Golden Idol', value: 750, lockSeconds: 4 },
    exit: { ...rect(24, 320, 48, 80), label: 'WEST DOOR' },
    start: { x: 1208, y: 360 },
    parSeconds: 90,
    alarmDecay: 6,
    walls: [
      // Vault room in the north-east, entered through the door gap at x 980..1060.
      rect(760, 250, 220, 24),
      rect(1060, 250, 196, 24),
      rect(760, 24, 24, 226),
      rect(520, 470, 240, 24),
    ],
    covers: [
      { ...rect(300, 160, 44, 44), kind: 'statue', sight: true },
      { ...rect(300, 516, 44, 44), kind: 'statue', sight: true },
      { ...rect(880, 560, 76, 52), kind: 'crate', sight: true },
      { ...rect(1000, 560, 76, 52), kind: 'crate', sight: true },
      { ...rect(640, 380, 90, 60), kind: 'case', sight: false },
      { ...rect(1045, 120, 90, 60), kind: 'case', sight: false },
      { ...rect(150, 600, 38, 38), kind: 'plant', sight: false },
      { ...rect(1150, 420, 38, 38), kind: 'plant', sight: false },
    ],
    guards: [
      { waypoints: [{ x: 860, y: 60 }, { x: 1180, y: 60 }, { x: 1180, y: 220 }, { x: 860, y: 220 }], phase: 0 },
      { waypoints: [{ x: 200, y: 340 }, { x: 780, y: 340 }, { x: 780, y: 620 }, { x: 200, y: 620 }], phase: 0.25 },
      { waypoints: [{ x: 700, y: 540 }, { x: 1180, y: 540 }, { x: 1180, y: 620 }, { x: 700, y: 620 }], phase: 0.6 },
    ],
    cameras: [
      { x: 784, y: 48, baseAngle: 0.9, sweep: 0.6, speed: 0.55 },
      { x: 64, y: 656, baseAngle: -0.8, sweep: 0.5, speed: 0.45 },
      { x: 1216, y: 400, baseAngle: Math.PI - 0.6, sweep: 0.5, speed: 0.5 },
    ],
    carpet: [rect(60, 330, 1160, 60)],
  },
  {
    name: 'JOB 3 — THE ROOFTOP GETAWAY',
    brief: 'One last prize — the Marlowe Ledger — then reach the helipad and vanish.',
    loot: { x: 640, y: 140, name: 'Marlowe Ledger', value: 1000, lockSeconds: 2 },
    exit: { ...rect(1120, 560, 120, 120), label: 'HELIPAD' },
    start: { x: 72, y: 360 },
    parSeconds: 90,
    alarmDecay: 5,
    walls: [
      rect(420, 96, 24, 114),
      rect(836, 414, 24, 210),
      rect(520, 470, 240, 24),
    ],
    covers: [
      { ...rect(300, 160, 76, 52), kind: 'crate', sight: true },
      { ...rect(904, 160, 76, 52), kind: 'crate', sight: true },
      { ...rect(300, 516, 76, 52), kind: 'crate', sight: true },
      { ...rect(904, 516, 76, 52), kind: 'crate', sight: true },
      { ...rect(595, 110, 90, 60), kind: 'case', sight: false },
      { ...rect(150, 110, 38, 38), kind: 'plant', sight: false },
      { ...rect(1092, 110, 38, 38), kind: 'plant', sight: false },
      { ...rect(640, 420, 44, 44), kind: 'statue', sight: true },
    ],
    guards: [
      { waypoints: [{ x: 260, y: 320 }, { x: 1020, y: 320 }, { x: 1020, y: 396 }, { x: 260, y: 396 }], phase: 0 },
      { waypoints: [{ x: 1020, y: 460 }, { x: 1020, y: 640 }, { x: 240, y: 640 }, { x: 240, y: 460 }], phase: 0.4 },
      { waypoints: [{ x: 460, y: 200 }, { x: 460, y: 660 }, { x: 880, y: 660 }, { x: 880, y: 330 }, { x: 460, y: 330 }], phase: 0.7 },
    ],
    cameras: [
      { x: 64, y: 64, baseAngle: 0.7, sweep: 0.6, speed: 0.6 },
      { x: 1216, y: 64, baseAngle: Math.PI - 0.7, sweep: 0.6, speed: 0.5 },
    ],
    carpet: [rect(60, 330, 1160, 60)],
  },
];
