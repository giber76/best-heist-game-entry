// Keyboard and pointer input. Held keys give a steering vector and the sneak
// and lockpick holds; one-shot presses (start, pause, smoke bomb, coin throw)
// are queued and taken once by the loop, so a press between two frames is
// never lost and never counted twice. A mouse click throws a coin at the
// clicked floor point, so the thief can lure a guard away from a patrol.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_JAM = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const INTERACT = new Set(['KeyE']);
const CONFIRM = new Set(['Enter']);
const SMOKE = new Set(['Space', 'KeyX']);
const JAM = new Set(['KeyQ']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let coinTarget = null;

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (SMOKE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else if (JAM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JAM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)
      || SNEAK.has(event.code) || INTERACT.has(event.code)) {
      // A held steering key: nothing to queue.
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of all.
  window.addEventListener('blur', () => {
    held.clear();
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    coinTarget = {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
    actions |= ACTION_CONFIRM;
  });

  function hasAny(keys) {
    for (const key of keys) if (held.has(key)) return true;
    return false;
  }

  return {
    /** Steering for this frame: dx/dy in -1..1, plus the sneak and interact holds. */
    move() {
      const dx = (hasAny(RIGHT) ? 1 : 0) - (hasAny(LEFT) ? 1 : 0);
      const dy = (hasAny(DOWN) ? 1 : 0) - (hasAny(UP) ? 1 : 0);
      return { dx, dy, sneak: hasAny(SNEAK), run: false, interact: hasAny(INTERACT) };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The floor point of the last click, if any, since the last call. */
    takeCoinTarget() {
      const taken = coinTarget;
      coinTarget = null;
      return taken;
    },
  };
}
