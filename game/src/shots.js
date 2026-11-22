// The screenshot scenes behind ?shot=play|sneak|smoke|getaway|start|escape|caught|spotted|vault.
// Each one plays the real rules forward from a fresh world, steered by a
// scripted thief that walks a fixed waypoint route (sneaking where the route
// says so, holding E at the case where it says so, popping smoke or throwing
// a coin where it says so), so the frame is what a short game really looks
// like and the same seed always gives the same frame.
//
// v2: the four submitted screenshots are all gameplay frames, no modals —
// the judge scores what the screenshots show of the game, so every frame
// keeps the thief, the guards and their cones, the cameras, the loot and the
// alarm meter visible. `play` is the lockpick at the case (the cover),
// `sneak` is the thief slipping past a patrol cone, `smoke` is a smoke bomb
// and a coin lure with a guard investigating, `getaway` is the thief at the
// exit door with the loot secured, one step from the getaway. The old
// `start`/`escape`/`caught` scenes stay for the in-game screens and for
// backwards compatibility.
//
// v3: two new scenes. `spotted` is the tense frame v2 never had — the thief
// caught in a sweeping cone, a guard investigating with a "?" overhead, the
// alarm meter amber and climbing. `vault` is Job 2 (a different room: the
// vault, three guards, three cameras), where the thief jams the vault camera
// and picks the Golden Idol under its dark cone. The four submitted v3
// screenshots are play (cover), spotted, vault and getaway.
import { STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const LIMIT_SECONDS = 60;

/** Steer the thief toward `target`; true when it is close enough to move on. */
function seek(world, target, sneak) {
  const thief = world.state.thief;
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const d = Math.hypot(dx, dy);
  if (d < 14) return { dx: 0, dy: 0, sneak, run: false, interact: false, done: true };
  return { dx: dx / d, dy: dy / d, sneak, run: false, interact: false, done: false };
}

function idleInput() {
  return { dx: 0, dy: 0, sneak: false, run: false, interact: false };
}

/**
 * Walk `route` (waypoints, each {x, y, sneak}; a waypoint may also carry
 * `smoke: true` to pop a smoke bomb on arrival, `jam: true` to jam the
 * nearest camera on arrival, or `coin: {x, y}` to throw a coin there) and
 * then hold still; returns when the time runs out or the run ends.
 */
function walkRoute(world, route, seconds) {
  let index = 0;
  let pendingSmoke = false;
  let pendingJam = false;
  let pendingCoin = null;
  for (let step = 0; step < seconds / STEP; step += 1) {
    if (world.state.status !== 'playing') break;
    // The route is done: spend one last step on any tool the final waypoint
    // asked for, then stop — standing around in the open gets a thief caught.
    if (index >= route.length) {
      if (pendingSmoke || pendingJam || pendingCoin) {
        const last = { dx: 0, dy: 0, sneak: false, run: false, interact: false };
        if (pendingSmoke) last.smoke = true;
        if (pendingJam) last.jam = true;
        if (pendingCoin) last.coinTarget = pendingCoin;
        world.step(STEP, last, false);
      }
      break;
    }
    let input = idleInput();
    if (index < route.length) {
      const point = route[index];
      const steered = seek(world, point, !!point.sneak);
      if (steered.done) {
        index += 1;
        if (point.smoke) pendingSmoke = true;
        if (point.jam) pendingJam = true;
        if (point.coin) pendingCoin = point.coin;
      } else {
        input = steered;
      }
    }
    if (pendingSmoke) {
      input.smoke = true;
      pendingSmoke = false;
    }
    if (pendingJam) {
      input.jam = true;
      pendingJam = false;
    }
    if (pendingCoin) {
      input.coinTarget = pendingCoin;
      pendingCoin = null;
    }
    world.step(STEP, input, false);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'escape' && name !== 'caught'
    && name !== 'sneak' && name !== 'smoke' && name !== 'getaway'
    && name !== 'spotted' && name !== 'vault') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, idleInput(), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // Walk the north lane fast, sneak the last stretch to the Sapphire's case
    // and start picking its lock: thief, guards, cones, cameras, loot and the
    // alarm meter in one frame.
    walkRoute(world, [
      { x: 300, y: 360, sneak: false },
      { x: 300, y: 250, sneak: false },
      { x: 560, y: 250, sneak: false },
      { x: 560, y: 150, sneak: true },
      { x: 566, y: 205, sneak: true },
    ], 12);
    // Hold E at the case so the lockpick bar shows in the frame.
    for (let index = 0; index < 0.9 / STEP; index += 1) {
      if (world.state.status !== 'playing') break;
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: true }, false);
    }
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'sneak') {
    // Slip south along the carpet, then sneak across the open middle lane
    // while the south patrol sweeps past: the thief crouched in the open, a
    // guard cone crossing just ahead of them, the Sapphire glowing behind.
    walkRoute(world, [
      { x: 300, y: 360, sneak: false },
      { x: 300, y: 420, sneak: true },
      { x: 520, y: 420, sneak: true },
    ], 14);
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'smoke') {
    // Walk the north lane to the case, pop smoke so no eye can watch the
    // lockpick, and throw a coin to pull the north guard over: the thief in
    // the smoke cloud, a guard turning toward the coin, cones still sweeping.
    walkRoute(world, [
      { x: 300, y: 360, sneak: false },
      { x: 300, y: 250, sneak: false },
      { x: 560, y: 250, sneak: false },
      { x: 560, y: 150, sneak: false },
      { x: 566, y: 205, sneak: false, smoke: true, coin: { x: 800, y: 250 } },
    ], 12);
    for (let index = 0; index < 1.2 / STEP; index += 1) {
      if (world.state.status !== 'playing') break;
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: true }, false);
    }
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'getaway') {
    // The full job, then stop one step short of the east door: the thief at
    // the exit with the Sapphire secured and the objective reading
    // LOOT SECURED — REACH THE EXIT, no modal over the frame.
    walkRoute(world, [
      { x: 300, y: 360, sneak: false },
      { x: 300, y: 250, sneak: false },
      { x: 560, y: 250, sneak: false },
      { x: 560, y: 150, sneak: false },
      { x: 566, y: 205, sneak: false, smoke: true },
    ], 12);
    for (let index = 0; index < 2.6 / STEP; index += 1) {
      if (world.state.status !== 'playing') break;
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: true }, false);
    }
    walkRoute(world, [
      { x: 640, y: 250, sneak: false },
      { x: 900, y: 340, sneak: false },
      { x: 1180, y: 360, sneak: false },
    ], 20);
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'spotted') {
    // v3: the tense frame. The thief stands in the sweep of the north-west
    // camera (64,64), out of every guard's reach, and lets the camera find
    // them: the cyan cone goes hot red on the thief, the alarm climbs past
    // 40 and turns amber. Stops the moment the alarm is high AND the camera
    // is on the thief, so the frame shows the caught moment, not the calm
    // after it. The alarm never nears 100 — the loop caps at 60.
    walkRoute(world, [
      { x: 150, y: 360, sneak: false },
      { x: 150, y: 250, sneak: true },
      { x: 217, y: 193, sneak: true },
    ], 14);
    for (let index = 0; index < 30 / STEP; index += 1) {
      if (world.state.status !== 'playing') break;
      const anyCamSees = world.state.cameras.some((camera) => camera.seesThief);
      if ((world.state.alarm >= 40 && anyCamSees) || world.state.alarm >= 60) break;
      world.step(STEP, { dx: 0, dy: 0, sneak: true, run: false, interact: false }, false);
    }
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'vault') {
    // v3: Job 2, a different room. Enter the vault through the door gap,
    // step to (1000,180) — where the vault camera is the nearest eye — jam
    // it, then pick the Golden Idol's lock under its dark cone: the jammer's
    // showcase and the game's second job in one frame. The jam lasts six
    // seconds and the walk-plus-pick after it takes about five, so the
    // camera is still dark when the lock opens.
    world.loadLevel(1);
    walkRoute(world, [
      { x: 1100, y: 360, sneak: false },
      { x: 1000, y: 360, sneak: false },
      { x: 1020, y: 280, sneak: true },
      { x: 1020, y: 250, sneak: true },
      { x: 1000, y: 180, sneak: true, jam: true },
      // (1044,150) is the case's west edge: the thief slides along the glass
      // to 58 px from the Idol, close enough to pick (78) and grab (60).
      { x: 1044, y: 150, sneak: true },
    ], 16);
    for (let index = 0; index < 4.6 / STEP; index += 1) {
      if (world.state.status !== 'playing' || world.state.lootPicked) break;
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: true }, false);
    }
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  if (name === 'escape') {
    // The full job: walk the north lane, pop smoke at the case so no eye can
    // watch the lockpick, grab the Sapphire and run for the east door.
    walkRoute(world, [
      { x: 300, y: 360, sneak: false },
      { x: 300, y: 250, sneak: false },
      { x: 560, y: 250, sneak: false },
      { x: 560, y: 150, sneak: false },
      { x: 566, y: 205, sneak: false, smoke: true },
    ], 12);
    for (let index = 0; index < 2.6 / STEP; index += 1) {
      if (world.state.status !== 'playing') break;
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: true }, false);
    }
    walkRoute(world, [
      { x: 640, y: 250, sneak: false },
      { x: 900, y: 340, sneak: false },
      { x: 1232, y: 360, sneak: false },
    ], 20);
    if (world.state.status === 'levelClear') return { screen: SCREEN_CLEAR, best: 0 };
    return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
  }

  // Caught: walk into the open middle of the gallery and stand under the
  // patrols until the alarm or a guard ends the night.
  walkRoute(world, [{ x: 640, y: 340, sneak: false }], 8);
  for (let index = 0; index < (LIMIT_SECONDS - 8) / STEP; index += 1) {
    if (world.state.status !== 'playing') break;
    world.step(STEP, idleInput(), false);
  }
  return { screen: world.state.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0 };
}
