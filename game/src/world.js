// The heist rules and state, with no drawing and no browser in it: the thief,
// the guards and their patrols, the sweeping cameras, the alarm, the loot and
// the tools (thrown coins, smoke bombs, the lockpick). step() advances one
// fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound.
import { ALARM, CAMERA, FIELD, GUARD, STEP, THIEF, TOOLS } from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_LOOT = 1;
export const EVENT_PICKED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_SPOTTED = 32;
export const EVENT_COIN = 64;

export const MODE_PATROL = 'patrol';
export const MODE_INVESTIGATE = 'investigate';
export const MODE_CHASE = 'chase';

const WALL = 24; // The outer wall's thickness, on every side.

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Smallest absolute angle between two headings, 0..PI. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the circle at (x, y) with radius r overlaps the rectangle. */
function circleHitsRect(x, y, r, rect) {
  const nearX = clamp(x, rect.x, rect.x + rect.w);
  const nearY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - nearX;
  const dy = y - nearY;
  return dx * dx + dy * dy < r * r;
}

/**
 * True when the segment (x1,y1)-(x2,y2) crosses the rectangle, by Liang-Barsky
 * clipping: the segment enters the rectangle's slab on both axes at once.
 */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let low = 0;
  let high = 1;
  const tests = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ];
  for (let i = 0; i < tests.length; i += 1) {
    const p = tests[i][0];
    const q = tests[i][1];
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > high) return false;
        if (t > low) low = t;
      } else {
        if (t < low) return false;
        if (t < high) high = t;
      }
    }
  }
  return true;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    thief: { x: 0, y: 0, angle: 0, sneak: false, run: false, moving: false },
    guards: [],
    cameras: [],
    alarm: 0,
    alarmPeak: 0,
    lootPicked: false,
    lootTaken: false,
    lockProgress: 0,
    coins: TOOLS.coinsPerLevel,
    smokes: TOOLS.smokePerLevel,
    thrownCoins: [],
    smokeClouds: [],
    score: 0,
    totalScore: 0,
    elapsed: 0,
    levelElapsed: 0,
    status: 'playing',
    caughtReason: '',
    spotted: false,
    levelClear: null,
  };

  /** Every rectangle that blocks movement: walls, outer bounds and solid cover. */
  function solids() {
    const list = [
      { x: 0, y: 0, w: FIELD.width, h: WALL },
      { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL },
      { x: 0, y: 0, w: WALL, h: FIELD.height },
      { x: FIELD.width - WALL, y: 0, w: WALL, h: FIELD.height },
    ];
    for (const wall of state.level.walls) list.push(wall);
    for (const cover of state.level.covers) {
      if (cover.kind !== 'plant') list.push(cover);
    }
    return list;
  }

  /** Every rectangle that blocks a line of sight. */
  function sightBlockers() {
    const list = solids();
    return list.filter((rect) => rect.sight !== false || state.level.walls.includes(rect));
  }

  function loadLevel(index) {
    state.levelIndex = index;
    state.level = LEVELS[index];
    const level = state.level;
    state.thief.x = level.start.x;
    state.thief.y = level.start.y;
    state.thief.angle = 0;
    state.guards = level.guards.map((def, i) => {
      const first = def.waypoints[0];
      return {
        x: first.x,
        y: first.y,
        angle: 0,
        waypoint: Math.floor(def.phase * def.waypoints.length) % def.waypoints.length,
        mode: MODE_PATROL,
        suspicion: 0,
        lastSeen: null,
        lastSeenAt: -99,
        pause: 0,
        lookTimer: 0,
        seesThief: false,
        id: i,
      };
    });
    state.cameras = level.cameras.map((def) => ({
      x: def.x,
      y: def.y,
      baseAngle: def.baseAngle,
      sweep: def.sweep,
      speed: def.speed,
      angle: def.baseAngle,
      seesThief: false,
    }));
    state.alarm = 0;
    state.alarmPeak = 0;
    state.lootPicked = false;
    state.lootTaken = false;
    state.lockProgress = 0;
    state.coins = TOOLS.coinsPerLevel;
    state.smokes = TOOLS.smokePerLevel;
    state.thrownCoins = [];
    state.smokeClouds = [];
    state.levelElapsed = 0;
    state.status = 'playing';
    state.caughtReason = '';
    state.spotted = false;
    state.levelClear = null;
  }

  function reset() {
    state.score = 0;
    state.totalScore = 0;
    state.elapsed = 0;
    loadLevel(0);
  }

  /** Move a circle with axis-separated sliding against every solid rectangle. */
  function moveCircle(body, dx, dy, radius) {
    const blocks = solids();
    let nx = body.x + dx;
    let blocked = false;
    for (const rect of blocks) if (circleHitsRect(nx, body.y, radius, rect)) { blocked = true; break; }
    if (!blocked) body.x = clamp(nx, WALL + radius, FIELD.width - WALL - radius);
    let ny = body.y + dy;
    blocked = false;
    for (const rect of blocks) if (circleHitsRect(body.x, ny, radius, rect)) { blocked = true; break; }
    if (!blocked) body.y = clamp(ny, WALL + radius, FIELD.height - WALL - radius);
  }

  function inSmoke(x, y) {
    for (const cloud of state.smokeClouds) {
      if (cloud.left > 0 && dist(x, y, cloud.x, cloud.y) < cloud.radius) return true;
    }
    return false;
  }

  /** True when nothing solid and no smoke sits between the eye and the thief. */
  function hasLineOfSight(x, y) {
    const thief = state.thief;
    if (inSmoke(thief.x, thief.y) || inSmoke(x, y)) return false;
    for (const cloud of state.smokeClouds) {
      if (cloud.left <= 0) continue;
      if (segmentHitsRect(x, y, thief.x, thief.y, {
        x: cloud.x - cloud.radius, y: cloud.y - cloud.radius,
        w: cloud.radius * 2, h: cloud.radius * 2,
      })) return false;
    }
    for (const rect of sightBlockers()) {
      if (rect.kind === 'case' || rect.kind === 'plant') continue;
      if (segmentHitsRect(x, y, thief.x, thief.y, rect)) return false;
    }
    return true;
  }

  /** True when the thief stands inside the eye's cone and the eye can see them. */
  function coneSees(eyeX, eyeY, angle, range, halfAngle) {
    const thief = state.thief;
    const d = dist(eyeX, eyeY, thief.x, thief.y);
    if (d > range) return false;
    if (d > 1 && angleDiff(Math.atan2(thief.y - eyeY, thief.x - eyeX), angle) > halfAngle) return false;
    return hasLineOfSight(eyeX, eyeY);
  }

  function moveToward(body, tx, ty, speed, dt) {
    const dx = tx - body.x;
    const dy = ty - body.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt);
    moveCircle(body, (dx / d) * step, (dy / d) * step, GUARD.radius);
    body.angle = Math.atan2(dy, dx);
    return d - step < 2;
  }

  function stepGuard(guard, dt, events) {
    const thief = state.thief;
    const seen = coneSees(guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle);
    guard.seesThief = seen;
    const seenFactor = thief.sneak ? THIEF.sneakSeen : thief.run ? THIEF.runSeen : THIEF.walkSeen;
    if (seen) {
      guard.suspicion = Math.min(1, guard.suspicion + GUARD.seeRate * seenFactor * dt);
      guard.lastSeen = { x: thief.x, y: thief.y };
      guard.lastSeenAt = state.levelElapsed;
      if (guard.suspicion >= 0.99) guard.mode = MODE_CHASE;
      else if (guard.suspicion > 0.35 && guard.mode === MODE_PATROL) guard.mode = MODE_INVESTIGATE;
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - GUARD.loseRate * dt);
      if (guard.mode === MODE_CHASE && state.levelElapsed - guard.lastSeenAt > 2.5) {
        guard.mode = MODE_INVESTIGATE;
      }
    }

    if (guard.mode === MODE_CHASE) {
      const target = guard.lastSeen || { x: thief.x, y: thief.y };
      moveToward(guard, target.x, target.y, GUARD.chaseSpeed, dt);
      state.alarm = Math.min(ALARM.max, state.alarm + GUARD.chaseAlarmRate * dt);
      if (dist(guard.x, guard.y, thief.x, thief.y) < GUARD.radius + THIEF.radius + 2) {
        return EVENT_CAUGHT;
      }
      return 0;
    }

    if (guard.mode === MODE_INVESTIGATE) {
      const target = guard.lastSeen;
      if (target && moveToward(guard, target.x, target.y, GUARD.investigateSpeed, dt)) {
        guard.lookTimer += dt;
        guard.angle += dt * 1.6;
        if (guard.lookTimer > 2) {
          guard.mode = MODE_PATROL;
          guard.lookTimer = 0;
          guard.suspicion = 0;
        }
      }
      return 0;
    }

    // Patrol: walk the waypoints, pausing at each to look around.
    const def = state.level.guards[guard.id];
    if (guard.pause > 0) {
      guard.pause -= dt;
      guard.angle += dt * 0.7;
      return 0;
    }
    const point = def.waypoints[guard.waypoint];
    if (moveToward(guard, point.x, point.y, GUARD.patrolSpeed, dt)) {
      guard.waypoint = (guard.waypoint + 1) % def.waypoints.length;
      guard.pause = 1.0 + random() * 0.8;
    }
    return events;
  }

  /**
   * One fixed step. `input` carries the thief's steering and tool use; with
   * `harmless` set (the title screen's backdrop) the patrols walk but nobody
   * sees the thief and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    if (state.status !== 'playing') return events;
    state.elapsed += dt;
    state.levelElapsed += dt;

    // The thief moves, sneaking slow and quiet, running fast and loud.
    const thief = state.thief;
    const speed = input.sneak ? THIEF.sneakSpeed : input.run ? THIEF.runSpeed : THIEF.walkSpeed;
    const moving = input.dx !== 0 || input.dy !== 0;
    thief.moving = moving;
    thief.sneak = input.sneak;
    thief.run = input.run;
    if (moving) {
      const len = Math.hypot(input.dx, input.dy);
      const nx = (input.dx / len) * speed * dt;
      const ny = (input.dy / len) * speed * dt;
      moveCircle(thief, nx, ny, THIEF.radius);
      thief.angle = Math.atan2(input.dy, input.dx);
    }

    // Tools: a thrown coin, a smoke bomb.
    if (input.coinTarget && state.coins > 0) {
      const target = input.coinTarget;
      const d = dist(thief.x, thief.y, target.x, target.y);
      const range = Math.min(d, TOOLS.coinThrowRange);
      const angle = Math.atan2(target.y - thief.y, target.x - thief.x);
      state.thrownCoins.push({
        x: thief.x + Math.cos(angle) * range,
        y: thief.y + Math.sin(angle) * range,
        left: 6,
      });
      state.coins -= 1;
      events |= EVENT_COIN;
      for (const guard of state.guards) {
        const coin = state.thrownCoins[state.thrownCoins.length - 1];
        if (dist(guard.x, guard.y, coin.x, coin.y) < TOOLS.coinNoiseRadius) {
          guard.lastSeen = { x: coin.x, y: coin.y };
          guard.lastSeenAt = state.levelElapsed;
          guard.suspicion = Math.max(guard.suspicion, 0.5);
          if (guard.mode === MODE_PATROL) guard.mode = MODE_INVESTIGATE;
        }
      }
    }
    if (input.smoke && state.smokes > 0) {
      state.smokeClouds.push({ x: thief.x, y: thief.y, radius: TOOLS.smokeRadius, left: TOOLS.smokeSeconds });
      state.smokes -= 1;
    }
    for (const cloud of state.smokeClouds) cloud.left -= dt;
    state.smokeClouds = state.smokeClouds.filter((cloud) => cloud.left > 0);
    for (const coin of state.thrownCoins) coin.left -= dt;
    state.thrownCoins = state.thrownCoins.filter((coin) => coin.left > 0);

    // Running is loud: nearby guards turn toward the noise.
    if (moving && input.run) {
      for (const guard of state.guards) {
        if (dist(guard.x, guard.y, thief.x, thief.y) < GUARD.hearRadius) {
          guard.suspicion = Math.min(1, guard.suspicion + 0.2 * dt);
          if (guard.suspicion > 0.35 && guard.mode === MODE_PATROL) {
            guard.lastSeen = { x: thief.x, y: thief.y };
            guard.lastSeenAt = state.levelElapsed;
            guard.mode = MODE_INVESTIGATE;
          }
        }
      }
    }

    // The lockpick: hold E beside the case, standing still, to open it.
    const loot = state.level.loot;
    const lootDist = dist(thief.x, thief.y, loot.x, loot.y);
    if (!state.lootPicked && input.interact && !moving && lootDist < 78) {
      state.lockProgress += dt / loot.lockSeconds;
      if (state.lockProgress >= 1) {
        state.lootPicked = true;
        events |= EVENT_PICKED;
      }
    } else if (!state.lootPicked) {
      state.lockProgress = Math.max(0, state.lockProgress - dt * 0.5);
    }
    // The loot sits inside its case, so the grab reaches over the glass.
    if (state.lootPicked && !state.lootTaken && lootDist < 60) {
      state.lootTaken = true;
      state.score += loot.value;
      events |= EVENT_LOOT;
    }

    // The way out only opens once the loot is in hand.
    const exit = state.level.exit;
    if (state.lootTaken && thief.x > exit.x && thief.x < exit.x + exit.w
      && thief.y > exit.y && thief.y < exit.y + exit.h) {
      const timeBonus = Math.max(0, Math.round((state.level.parSeconds - state.levelElapsed) * 10));
      const ghost = state.alarmPeak <= ALARM.ghostLine ? ALARM.ghostBonus : 0;
      state.levelClear = { timeBonus, ghost, lootValue: loot.value };
      state.score += timeBonus + ghost;
      state.totalScore += state.score;
      state.score = 0; // Banked: totalScore now holds every finished level.
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.status = 'won';
        events |= EVENT_WIN;
      } else {
        state.status = 'levelClear';
        events |= EVENT_LEVEL_CLEAR;
      }
      return events;
    }

    if (!harmless) {
      // Guards and cameras watch; being seen feeds the alarm.
      let anySeen = false;
      for (const guard of state.guards) {
        const caught = stepGuard(guard, dt, events);
        if (caught & EVENT_CAUGHT) {
          state.status = 'caught';
          state.caughtReason = 'A guard grabbed you in the dark.';
          return EVENT_CAUGHT;
        }
        if (guard.seesThief) anySeen = true;
      }
      for (const camera of state.cameras) {
        camera.angle = camera.baseAngle + camera.sweep * Math.sin(state.levelElapsed * camera.speed);
        camera.seesThief = coneSees(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.coneHalfAngle);
        if (camera.seesThief) {
          anySeen = true;
          state.alarm = Math.min(ALARM.max, state.alarm + CAMERA.alarmRate * dt);
        }
      }
      if (anySeen) {
        state.alarm = Math.min(ALARM.max, state.alarm + ALARM.spotRate * dt * 0.4);
        if (!state.spotted && state.alarm > 40) {
          state.spotted = true;
          events |= EVENT_SPOTTED;
        }
      } else {
        state.alarm = Math.max(0, state.alarm - state.level.alarmDecay * dt);
      }
      state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
      if (state.alarm >= ALARM.max) {
        state.status = 'caught';
        state.caughtReason = 'The alarm hit 100 — the museum locked down.';
        return EVENT_CAUGHT;
      }
    } else {
      // Title backdrop: patrols walk, cameras sweep, nobody watches.
      for (const guard of state.guards) {
        const def = state.level.guards[guard.id];
        if (guard.pause > 0) {
          guard.pause -= dt;
          guard.angle += dt * 0.7;
        } else {
          const point = def.waypoints[guard.waypoint];
          if (moveToward(guard, point.x, point.y, GUARD.patrolSpeed, dt)) {
            guard.waypoint = (guard.waypoint + 1) % def.waypoints.length;
            guard.pause = 1.0;
          }
        }
      }
      for (const camera of state.cameras) {
        camera.angle = camera.baseAngle + camera.sweep * Math.sin(state.levelElapsed * camera.speed);
      }
    }
    return events;
  }

  /** Move on to the next job after a level clear. */
  function nextLevel() {
    state.score = 0;
    loadLevel(state.levelIndex + 1);
  }

  reset();
  return { state, reset, step, nextLevel, loadLevel };
}
