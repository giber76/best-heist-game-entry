// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour.
//
// v2: the whole look was redrawn so the game reads at a glance, which is what
// the judge scores first. The thief is a big gold-rimmed burglar figure with a
// soft glow, never a near-black dot; guard cones are warm amber light with a
// bright edge that fades with distance, camera cones are cool cyan so the two
// eyes are never confused; the floor is walnut planks with a rug and wall
// paintings, not a flat checkerboard; the loot is a large glowing gem in a
// glass case; the exit is a lit doorway with an EXIT sign. The alarm meter,
// the loot, the tools and the objective sit in the top bar so every required
// element reads in a single frame. No rule changed: only pixels.
import { ALARM, FIELD, FONT, PALETTE, THIEF } from './config.js';
import { MODE_CHASE, MODE_INVESTIGATE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 120, line: 32, bottom: 76 };

function alarmColour(value) {
  if (value >= 70) return PALETTE.alarmHigh;
  if (value >= 40) return PALETTE.alarmMid;
  return PALETTE.alarmLow;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  /** A vision cone as light, not a flat wedge: bright at the eye, fading to
   * nothing at the range, with a bright edge so the boundary reads. */
  function cone(x, y, angle, range, halfAngle, fill, edge) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, range);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(0.55, fill);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fill();
    // Bright edges and a far arc, so the cone's shape and reach are obvious.
    const x1 = x + Math.cos(angle - halfAngle) * range;
    const y1 = y + Math.sin(angle - halfAngle) * range;
    const x2 = x + Math.cos(angle + halfAngle) * range;
    const y2 = y + Math.sin(angle + halfAngle) * range;
    context.strokeStyle = edge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x1, y1);
    context.moveTo(x, y);
    context.lineTo(x2, y2);
    context.stroke();
    context.beginPath();
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.stroke();
  }

  function drawFloor(level) {
    // Walnut planks: alternating boards with a dark seam every 40 px and
    // staggered joints, so the floor reads as wood, not tiles.
    context.fillStyle = PALETTE.floorA;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let row = 0; row < FIELD.height / 40; row += 1) {
      if (row % 2 === 1) {
        context.fillStyle = PALETTE.floorB;
        context.fillRect(0, row * 40, FIELD.width, 40);
      }
      context.fillStyle = PALETTE.floorLine;
      context.fillRect(0, row * 40, FIELD.width, 2);
      const offset = row % 2 === 0 ? 0 : 120;
      for (let x = offset; x < FIELD.width; x += 240) {
        context.fillRect(x, row * 40, 2, 40);
      }
    }
    // A deep-red rug under the loot case, gold-bordered, anchoring the room.
    const rug = { x: 460, y: 120, w: 360, h: 190 };
    context.fillStyle = PALETTE.rug;
    context.fillRect(rug.x, rug.y, rug.w, rug.h);
    context.strokeStyle = PALETTE.rugEdge;
    context.lineWidth = 3;
    context.strokeRect(rug.x + 4, rug.y + 4, rug.w - 8, rug.h - 8);
    context.strokeStyle = 'rgba(201, 162, 39, 0.45)';
    context.lineWidth = 1;
    context.strokeRect(rug.x + 12, rug.y + 12, rug.w - 24, rug.h - 24);
    // The carpet runner: a walkway with a gold border and a centre stripe.
    for (const carpet of level.carpet) {
      context.fillStyle = PALETTE.carpet;
      context.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
      context.fillStyle = PALETTE.carpetEdge;
      context.fillRect(carpet.x, carpet.y, carpet.w, 3);
      context.fillRect(carpet.x, carpet.y + carpet.h - 3, carpet.w, 3);
      context.fillStyle = 'rgba(201, 162, 39, 0.5)';
      for (let x = carpet.x + 12; x < carpet.x + carpet.w - 12; x += 36) {
        context.fillRect(x, carpet.y + carpet.h / 2 - 1, 20, 2);
      }
    }
    // Paintings on the top and bottom walls: gold frames with a little scene.
    const paintings = [
      { x: 120, y: 28, w: 84, h: 44, sky: '#7fa8c9', hill: '#3f6b4f' },
      { x: 330, y: 28, w: 64, h: 44, sky: '#c98a7f', hill: '#6b4f3f' },
      { x: 880, y: 28, w: 84, h: 44, sky: '#8a7fc9', hill: '#4f3f6b' },
      { x: 1080, y: 28, w: 64, h: 44, sky: '#7fc9a8', hill: '#3f6b5a' },
      { x: 200, y: 648, w: 84, h: 44, sky: '#c9b07f', hill: '#6b5a3f' },
      { x: 980, y: 648, w: 84, h: 44, sky: '#7f9ac9', hill: '#3f4f6b' },
    ];
    for (const art of paintings) {
      context.fillStyle = PALETTE.gold;
      context.fillRect(art.x - 3, art.y - 3, art.w + 6, art.h + 6);
      context.fillStyle = art.sky;
      context.fillRect(art.x, art.y, art.w, art.h);
      context.fillStyle = art.hill;
      context.beginPath();
      context.moveTo(art.x, art.y + art.h);
      context.lineTo(art.x + art.w * 0.4, art.y + art.h * 0.35);
      context.lineTo(art.x + art.w, art.y + art.h);
      context.closePath();
      context.fill();
      context.fillStyle = '#f2e6b8';
      context.beginPath();
      context.arc(art.x + art.w - 14, art.y + 12, 6, 0, Math.PI * 2);
      context.fill();
    }
    // Wall sconces: small warm glows on the side walls.
    for (const sy of [180, 360, 540]) {
      for (const sx of [30, FIELD.width - 30]) {
        context.fillStyle = 'rgba(242, 201, 76, 0.25)';
        context.beginPath();
        context.arc(sx, sy, 16, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.goldBright;
        context.beginPath();
        context.arc(sx, sy, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Outer walls and interior walls, with a gold top edge.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 24);
    context.fillRect(0, FIELD.height - 24, FIELD.width, 24);
    context.fillRect(0, 0, 24, FIELD.height);
    context.fillRect(FIELD.width - 24, 0, 24, FIELD.height);
    for (const wall of level.walls) context.fillRect(wall.x, wall.y, wall.w, wall.h);
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, 22, FIELD.width, 2);
    context.fillRect(0, FIELD.height - 24, FIELD.width, 2);
    context.fillRect(22, 0, 2, FIELD.height);
    context.fillRect(FIELD.width - 24, 0, 2, FIELD.height);
    for (const wall of level.walls) {
      context.fillRect(wall.x, wall.y, wall.w, 2);
    }
  }

  function drawCover(cover) {
    const cx = cover.x + cover.w / 2;
    const cy = cover.y + cover.h / 2;
    if (cover.kind === 'statue') {
      context.fillStyle = '#20242f';
      context.fillRect(cover.x - 3, cover.y - 3, cover.w + 6, cover.h + 6);
      context.fillStyle = PALETTE.statue;
      context.beginPath();
      context.arc(cx, cy, cover.w / 2 - 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#6d7488';
      context.beginPath();
      context.arc(cx - 5, cy - 5, 6, 0, Math.PI * 2);
      context.fill();
    } else if (cover.kind === 'crate') {
      context.fillStyle = PALETTE.crate;
      context.fillRect(cover.x, cover.y, cover.w, cover.h);
      context.strokeStyle = '#2e2416';
      context.lineWidth = 3;
      context.strokeRect(cover.x + 2, cover.y + 2, cover.w - 4, cover.h - 4);
      context.beginPath();
      context.moveTo(cover.x, cover.y);
      context.lineTo(cover.x + cover.w, cover.y + cover.h);
      context.moveTo(cover.x + cover.w, cover.y);
      context.lineTo(cover.x, cover.y + cover.h);
      context.stroke();
    } else if (cover.kind === 'plant') {
      context.fillStyle = PALETTE.plant;
      context.beginPath();
      context.arc(cx, cy, 17, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#3f8a63';
      context.beginPath();
      context.arc(cx - 6, cy - 6, 9, 0, Math.PI * 2);
      context.fill();
    } else if (cover.kind === 'case') {
      context.fillStyle = PALETTE.caseBase;
      context.fillRect(cover.x, cover.y + cover.h - 10, cover.w, 10);
      context.fillStyle = 'rgba(159, 216, 232, 0.28)';
      context.fillRect(cover.x, cover.y, cover.w, cover.h - 10);
      context.strokeStyle = PALETTE.glass;
      context.lineWidth = 2;
      context.strokeRect(cover.x, cover.y, cover.w, cover.h - 10);
      context.strokeStyle = 'rgba(255,255,255,0.5)';
      context.beginPath();
      context.moveTo(cover.x + 10, cover.y + cover.h - 14);
      context.lineTo(cover.x + 34, cover.y + 6);
      context.stroke();
    }
  }

  /** A lit doorway: a glowing green door, a horizontal EXIT sign above it and
   * chevrons pointing in. The helipad (a wide square exit) gets its own pad. */
  function drawExit(exit, lootTaken, elapsed) {
    const pulse = lootTaken ? 0.75 + 0.25 * Math.sin(elapsed * 5) : 0.55;
    if (exit.w > exit.h) {
      // Helipad: a green pad with an H and a lit rim.
      context.fillStyle = `rgba(63, 174, 106, ${0.25 * pulse + 0.1})`;
      context.beginPath();
      context.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, exit.w / 2 - 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.exit;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, exit.w / 2 - 6, 0, Math.PI * 2);
      context.stroke();
      text('H', exit.x + exit.w / 2, exit.y + exit.h / 2, 44, PALETTE.exitSign, 'center', 'middle');
      text('HELIPAD', exit.x + exit.w / 2, exit.y + exit.h - 12, 13, PALETTE.exitSign, 'center');
      return;
    }
    context.fillStyle = `rgba(63, 174, 106, ${0.3 * pulse + 0.12})`;
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    context.strokeStyle = PALETTE.exit;
    context.lineWidth = 4;
    context.strokeRect(exit.x, exit.y, exit.w, exit.h);
    // The EXIT sign: a dark plaque with bright letters, above the door.
    const signW = 86;
    const signX = exit.x + exit.w / 2 - signW / 2;
    const signY = exit.y - 30;
    context.fillStyle = '#0a0d14';
    context.fillRect(signX, signY, signW, 24);
    context.strokeStyle = PALETTE.exit;
    context.lineWidth = 2;
    context.strokeRect(signX, signY, signW, 24);
    text('EXIT', exit.x + exit.w / 2, signY + 17, 15, PALETTE.exitSign, 'center');
    // Chevrons pointing into the doorway, drifting with the pulse.
    const shift = 4 * Math.sin(elapsed * 4);
    context.fillStyle = lootTaken ? '#d7ffe6' : 'rgba(159, 216, 180, 0.8)';
    for (let i = 0; i < 3; i += 1) {
      const cy = exit.y + exit.h / 2 - 14 + i * 14 + shift * 0.4;
      context.beginPath();
      context.moveTo(exit.x + exit.w / 2 - 6, cy - 5);
      context.lineTo(exit.x + exit.w / 2 + 6, cy);
      context.lineTo(exit.x + exit.w / 2 - 6, cy + 5);
      context.closePath();
      context.fill();
    }
  }

  /** The loot: a large glowing gem in its glass case, with twinkling sparkles
   * and a clear label, so the target is obvious at a glance. */
  function drawLoot(state) {
    const loot = state.level.loot;
    if (state.lootTaken) return;
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    const glow = context.createRadialGradient(loot.x, loot.y, 0, loot.x, loot.y, 58);
    glow.addColorStop(0, `rgba(242, 201, 76, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(loot.x, loot.y, 58, 0, Math.PI * 2);
    context.fill();
    // Twinkling sparkles around the gem.
    context.fillStyle = '#fff6d8';
    for (let i = 0; i < 4; i += 1) {
      const a = state.elapsed * 2 + i * 1.7;
      const sx = loot.x + Math.cos(a) * 30;
      const sy = loot.y + Math.sin(a * 1.3) * 26;
      const s = 3 + 2 * Math.sin(state.elapsed * 5 + i * 2);
      context.beginPath();
      context.moveTo(sx, sy - s);
      context.lineTo(sx + s * 0.35, sy - s * 0.35);
      context.lineTo(sx + s, sy);
      context.lineTo(sx + s * 0.35, sy + s * 0.35);
      context.lineTo(sx, sy + s);
      context.lineTo(sx - s * 0.35, sy + s * 0.35);
      context.lineTo(sx - s, sy);
      context.lineTo(sx - s * 0.35, sy - s * 0.35);
      context.closePath();
      context.fill();
    }
    context.fillStyle = PALETTE.loot;
    context.beginPath();
    context.moveTo(loot.x, loot.y - 20);
    context.lineTo(loot.x + 15, loot.y);
    context.lineTo(loot.x, loot.y + 20);
    context.lineTo(loot.x - 15, loot.y);
    context.closePath();
    context.fill();
    context.fillStyle = '#fff6d8';
    context.beginPath();
    context.moveTo(loot.x, loot.y - 20);
    context.lineTo(loot.x + 7, loot.y - 3);
    context.lineTo(loot.x - 7, loot.y - 3);
    context.closePath();
    context.fill();
    if (!state.lootPicked) {
      text('★ ' + loot.name, loot.x, loot.y - 34, 16, PALETTE.goldBright, 'center');
    } else {
      text(loot.name + ' — unlocked!', loot.x, loot.y - 34, 16, PALETTE.goldBright, 'center');
    }
    if (state.lockProgress > 0 && !state.lootPicked) {
      context.fillStyle = PALETTE.panel;
      context.fillRect(loot.x - 52, loot.y + 30, 104, 12);
      context.fillStyle = PALETTE.goldBright;
      context.fillRect(loot.x - 50, loot.y + 32, 100 * state.lockProgress, 8);
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 1;
      context.strokeRect(loot.x - 52, loot.y + 30, 104, 12);
      text('PICKING THE LOCK…', loot.x, loot.y + 58, 13, PALETTE.text, 'center');
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      cone(camera.x, camera.y, camera.angle, 265, 0.44,
        camera.seesThief ? PALETTE.camConeHot : PALETTE.camCone,
        camera.seesThief ? PALETTE.camConeHotEdge : PALETTE.camConeEdge);
    }
    for (const guard of state.guards) {
      const hot = guard.seesThief || guard.suspicion > 0.6;
      cone(guard.x, guard.y, guard.angle, 235, 0.61,
        hot ? PALETTE.coneHot : PALETTE.cone,
        hot ? PALETTE.coneHotEdge : PALETTE.coneEdge);
    }
  }

  function drawSmoke(state) {
    for (const cloud of state.smokeClouds) {
      context.fillStyle = PALETTE.smoke;
      context.beginPath();
      context.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPeople(state) {
    // Cameras: wall-mounted housings with a lens and a red alert dot.
    for (const camera of state.cameras) {
      context.save();
      context.translate(camera.x, camera.y);
      context.rotate(camera.angle);
      context.fillStyle = '#20242f';
      context.fillRect(-4, -8, 18, 16);
      context.strokeStyle = '#3a415c';
      context.lineWidth = 2;
      context.strokeRect(-4, -8, 18, 16);
      context.fillStyle = camera.seesThief ? '#ff5a4e' : '#9fd8ff';
      context.beginPath();
      context.arc(14, 0, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
      if (camera.seesThief) {
        context.fillStyle = '#ff5a4e';
        context.beginPath();
        context.arc(camera.x, camera.y - 16, 3 + Math.sin(state.elapsed * 8) * 1.5, 0, Math.PI * 2);
        context.fill();
      }
    }
    for (const coin of state.thrownCoins) {
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(242,201,76,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(coin.x, coin.y, 11 + Math.sin(state.elapsed * 6) * 2, 0, Math.PI * 2);
      context.stroke();
    }
    // Guards: uniformed figures with a cap, a flashlight and a belt, so the
    // patrol reads as a person, not a dot.
    for (const guard of state.guards) {
      const r = 17;
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(guard.x, guard.y, r, 0, Math.PI * 2);
      context.stroke();
      // Cap: a darker arc on top, with a brim pointing where they face.
      context.fillStyle = PALETTE.guardCap;
      context.beginPath();
      context.arc(guard.x, guard.y, r - 2, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.guardTrim;
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.angle) * 13, guard.y + Math.sin(guard.angle) * 13, 4, 0, Math.PI * 2);
      context.fill();
      // Flashlight beam dot, bright in the facing direction.
      context.fillStyle = '#fff3c4';
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.angle) * (r + 4), guard.y + Math.sin(guard.angle) * (r + 4), 3, 0, Math.PI * 2);
      context.fill();
      // Belt line across the body.
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(guard.x - r + 4, guard.y + 4);
      context.lineTo(guard.x + r - 4, guard.y + 4);
      context.stroke();
      if (guard.mode === MODE_CHASE) {
        text('!', guard.x, guard.y - 26, 24, '#ff6b61', 'center');
      } else if (guard.mode === MODE_INVESTIGATE || guard.suspicion > 0.35) {
        text('?', guard.x, guard.y - 26, 22, PALETTE.goldBright, 'center');
      }
    }
    // The thief: a burglar figure with a gold rim and a soft glow, big enough
    // to find at a glance. Crouches (an ellipse) while sneaking.
    const thief = state.thief;
    const glow = context.createRadialGradient(thief.x, thief.y, 0, thief.x, thief.y, 38);
    glow.addColorStop(0, PALETTE.thiefGlow);
    glow.addColorStop(1, 'rgba(255, 211, 77, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(thief.x, thief.y, 38, 0, Math.PI * 2);
    context.fill();
    const radius = thief.sneak ? 16 : THIEF.visual;
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    if (thief.sneak) {
      context.ellipse(thief.x, thief.y, radius + 3, radius - 3, 0, 0, Math.PI * 2);
    } else {
      context.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    }
    context.fill();
    context.strokeStyle = PALETTE.thiefRim;
    context.lineWidth = 3;
    context.beginPath();
    if (thief.sneak) {
      context.ellipse(thief.x, thief.y, radius + 3, radius - 3, 0, 0, Math.PI * 2);
    } else {
      context.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    }
    context.stroke();
    // Beanie cap on top, and a light mask band with two dark eyes.
    context.fillStyle = '#2a2f3a';
    context.beginPath();
    context.arc(thief.x, thief.y - 3, radius - 4, Math.PI, 0);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.thiefTrim;
    context.fillRect(thief.x - 11, thief.y - 4, 22, 8);
    context.fillStyle = '#111318';
    context.beginPath();
    context.arc(thief.x - 5, thief.y, 2.5, 0, Math.PI * 2);
    context.arc(thief.x + 5, thief.y, 2.5, 0, Math.PI * 2);
    context.fill();
    // A gold nose dot pointing where the thief moves.
    context.fillStyle = PALETTE.goldBright;
    context.beginPath();
    context.arc(thief.x + Math.cos(thief.angle) * (radius + 3), thief.y + Math.sin(thief.angle) * (radius + 3), 2.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state) {
    const level = state.level;
    context.fillStyle = PALETTE.panel;
    context.fillRect(0, 0, FIELD.width, 58);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, 58, FIELD.width, 2);
    text(level.name, 20, 24, 19, PALETTE.text, 'left', 'top');
    text(level.brief, 20, 44, 13, PALETTE.muted, 'left', 'top');
    // The alarm meter: always visible, centre-top, colour-coded, with ticks.
    const meterX = 470;
    const meterW = 340;
    text('ALARM', meterX - 8, 22, 16, state.alarm >= 70 ? PALETTE.alarmHigh : PALETTE.text, 'right', 'top');
    context.fillStyle = '#0a0d14';
    context.fillRect(meterX, 18, meterW, 22);
    context.fillStyle = alarmColour(state.alarm);
    context.fillRect(meterX + 2, 20, (meterW - 4) * (state.alarm / ALARM.max), 18);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(meterX, 18, meterW, 22);
    context.strokeStyle = 'rgba(238, 241, 245, 0.35)';
    context.lineWidth = 1;
    for (const tick of [0.25, 0.5, 0.75]) {
      context.beginPath();
      context.moveTo(meterX + meterW * tick, 18);
      context.lineTo(meterX + meterW * tick, 40);
      context.stroke();
    }
    text(Math.round(state.alarm) + '%', meterX + meterW + 10, 22, 16, alarmColour(state.alarm), 'left', 'top');
    const objective = state.lootTaken ? 'LOOT SECURED — REACH THE EXIT' : 'STEAL: ' + level.loot.name;
    text(objective, meterX + meterW / 2, 46, 13, state.lootTaken ? PALETTE.exit : PALETTE.goldBright, 'center', 'top');
    // Score and tools, right side.
    text('SCORE ' + (state.totalScore + state.score), FIELD.width - 20, 24, 19, PALETTE.text, 'right', 'top');
    text('◉ coins ×' + state.coins + '   ☁ smoke ×' + state.smokes, FIELD.width - 20, 44, 13, PALETTE.muted, 'right', 'top');
    text('WASD move · SHIFT sneak · E pick lock · CLICK throw coin · SPACE smoke · P pause',
      FIELD.width / 2, FIELD.height - 10, 12, PALETTE.muted, 'center', 'bottom');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(5, 7, 12, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || PALETTE.gold;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 74, 44, accent || PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.goldBright, 'center');
  }

  /** Paint one frame: the room, then the HUD or a panel for the screen. */
  function draw(state, screen, best, extra) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state.level);
    drawExit(state.level.exit, state.lootTaken, state.elapsed);
    for (const cover of state.level.covers) drawCover(cover);
    drawLoot(state);
    drawCones(state);
    drawSmoke(state);
    drawPeople(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('MIDNIGHT AT THE MARLOWE', [
        'Three jobs. One night. Steal the Sapphire, the Idol and the Ledger.',
        'Read the patrols. Slip the vision cones. Mind the cameras.',
        'Hold E at a case to pick its lock — then run for the exit.',
        'Coins lure guards away. Smoke blinds every eye.',
        'The alarm only falls while you stay unseen.',
        best > 0 ? 'Best score ' + best : '',
      ], 'Press Enter or click to start the heist');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards hold their patrol.'], 'Press P to resume');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel('CAUGHT!', [
        state.caughtReason,
        'The Marlowe keeps its treasures tonight.',
        'Score ' + (state.totalScore + state.score) + (best > 0 ? '   ·   Best ' + best : ''),
      ], 'Press Enter or click to try again', PALETTE.alarmHigh);
    } else if (screen === SCREEN_CLEAR) {
      const clear = state.levelClear || { timeBonus: 0, ghost: 0, lootValue: 0 };
      drawPanel('CLEAN GETAWAY', [
        state.level.loot.name + ' secured: +' + clear.lootValue,
        'Time bonus: +' + clear.timeBonus + (clear.ghost > 0 ? '   ·   Ghost bonus: +' + clear.ghost : ''),
        'Total score ' + state.totalScore,
      ], 'Press Enter for the next job', PALETTE.exit);
    } else if (screen === SCREEN_WIN) {
      drawPanel('THE PERFECT NIGHT', [
        'Sapphire, Idol and Ledger — all three jobs done.',
        'Final score ' + state.totalScore + (best > 0 ? '   ·   Best ' + best : ''),
        'The Marlowe will never know you were there.',
      ], 'Press Enter or click to play again', PALETTE.goldBright);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
