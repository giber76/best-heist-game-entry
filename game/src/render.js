// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Vision cones are translucent wedges over the floor;
// the alarm meter, the loot, the tools and the objective sit in the top bar so
// every required element reads in a single frame.
import { ALARM, FIELD, FONT, PALETTE, THIEF } from './config.js';
import { MODE_CHASE, MODE_INVESTIGATE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 120, line: 32, bottom: 76 };
const TILE = 80;

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

  function wedge(x, y, angle, range, halfAngle, colour) {
    context.fillStyle = colour;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fill();
  }

  function drawFloor(level) {
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    for (const carpet of level.carpet) {
      context.fillStyle = PALETTE.carpet;
      context.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
      context.fillStyle = PALETTE.carpetEdge;
      context.fillRect(carpet.x, carpet.y, carpet.w, 3);
      context.fillRect(carpet.x, carpet.y + carpet.h - 3, carpet.w, 3);
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

  function drawExit(exit, lootTaken) {
    context.fillStyle = lootTaken ? PALETTE.exitGlow : 'rgba(63, 174, 106, 0.16)';
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    context.strokeStyle = lootTaken ? PALETTE.exit : '#2c6b44';
    context.lineWidth = 3;
    context.strokeRect(exit.x, exit.y, exit.w, exit.h);
    context.save();
    context.translate(exit.x + exit.w / 2, exit.y + exit.h / 2);
    context.fillStyle = lootTaken ? '#d7ffe6' : '#9fd8b4';
    context.font = `bold 13px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const label = exit.label;
    if (exit.w > exit.h) {
      context.fillText('HELIPAD', 0, -8);
      context.fillText('EXIT', 0, 10);
    } else {
      context.rotate(-Math.PI / 2);
      context.fillText(label, 0, 0);
    }
    context.restore();
  }

  function drawLoot(state) {
    const loot = state.level.loot;
    if (state.lootTaken) return;
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    context.fillStyle = `rgba(242, 201, 76, ${0.25 * pulse})`;
    context.beginPath();
    context.arc(loot.x, loot.y, 34 + 6 * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.loot;
    context.beginPath();
    context.moveTo(loot.x, loot.y - 14);
    context.lineTo(loot.x + 11, loot.y);
    context.lineTo(loot.x, loot.y + 14);
    context.lineTo(loot.x - 11, loot.y);
    context.closePath();
    context.fill();
    context.fillStyle = '#fff6d8';
    context.beginPath();
    context.moveTo(loot.x, loot.y - 14);
    context.lineTo(loot.x + 5, loot.y - 2);
    context.lineTo(loot.x - 5, loot.y - 2);
    context.closePath();
    context.fill();
    if (!state.lootPicked) {
      text('◆ ' + loot.name, loot.x, loot.y - 26, 15, PALETTE.goldBright, 'center');
    } else {
      text(loot.name + ' — unlocked!', loot.x, loot.y - 26, 15, PALETTE.goldBright, 'center');
    }
    if (state.lockProgress > 0 && !state.lootPicked) {
      context.fillStyle = PALETTE.panel;
      context.fillRect(loot.x - 40, loot.y + 24, 80, 10);
      context.fillStyle = PALETTE.goldBright;
      context.fillRect(loot.x - 38, loot.y + 26, 76 * state.lockProgress, 6);
      text('PICKING THE LOCK…', loot.x, loot.y + 48, 12, PALETTE.text, 'center');
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      wedge(camera.x, camera.y, camera.angle, 265, 0.44,
        camera.seesThief ? PALETTE.camConeHot : PALETTE.camCone);
    }
    for (const guard of state.guards) {
      const hot = guard.seesThief || guard.suspicion > 0.6;
      wedge(guard.x, guard.y, guard.angle, 235, 0.61, hot ? PALETTE.coneHot : PALETTE.cone);
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
    for (const camera of state.cameras) {
      context.fillStyle = '#20242f';
      context.beginPath();
      context.arc(camera.x, camera.y, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = camera.seesThief ? '#ff5a4e' : '#9fd8ff';
      context.beginPath();
      context.arc(camera.x, camera.y, 5, 0, Math.PI * 2);
      context.fill();
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
    for (const guard of state.guards) {
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      context.stroke();
      // Cap brim and torch dot, showing which way the guard faces.
      context.fillStyle = PALETTE.guardTrim;
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.angle) * 10, guard.y + Math.sin(guard.angle) * 10, 4, 0, Math.PI * 2);
      context.fill();
      if (guard.mode === MODE_CHASE) {
        text('!', guard.x, guard.y - 22, 22, '#ff6b61', 'center');
      } else if (guard.mode === MODE_INVESTIGATE || guard.suspicion > 0.35) {
        text('?', guard.x, guard.y - 22, 20, PALETTE.goldBright, 'center');
      }
    }
    const thief = state.thief;
    const radius = thief.sneak ? 11 : THIEF.radius;
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefTrim;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    context.stroke();
    // Mask band across the face, pointing where the thief moves.
    context.strokeStyle = PALETTE.thiefTrim;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(thief.x - Math.cos(thief.angle) * 4 - Math.sin(thief.angle) * 7,
      thief.y - Math.sin(thief.angle) * 4 + Math.cos(thief.angle) * 7);
    context.lineTo(thief.x - Math.cos(thief.angle) * 4 + Math.sin(thief.angle) * 7,
      thief.y - Math.sin(thief.angle) * 4 - Math.cos(thief.angle) * 7);
    context.stroke();
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
    // The alarm meter: always visible, centre-top, colour-coded.
    const meterX = 470;
    const meterW = 340;
    text('ALARM', meterX - 8, 24, 15, state.alarm >= 70 ? PALETTE.alarmHigh : PALETTE.text, 'right', 'top');
    context.fillStyle = '#0a0d14';
    context.fillRect(meterX, 20, meterW, 18);
    context.fillStyle = alarmColour(state.alarm);
    context.fillRect(meterX + 2, 22, (meterW - 4) * (state.alarm / ALARM.max), 14);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(meterX, 20, meterW, 18);
    text(Math.round(state.alarm) + '%', meterX + meterW + 10, 24, 15, alarmColour(state.alarm), 'left', 'top');
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
    drawExit(state.level.exit, state.lootTaken);
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
