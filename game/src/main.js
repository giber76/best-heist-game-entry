// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// paused, caught, level clear and the perfect night.
//
// ?seed=N fixes the patrol jitter. ?shot=start|play|escape|caught (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { makeRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_JAM, EVENT_LEVEL_CLEAR, EVENT_LOOT, EVENT_PICKED, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_JAM, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(makeRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // The one-shot presses of this frame, taken once in frame() and spent by step().
  let frameActions = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Steal the Star Sapphire, then reach the east door.');
  }

  function finishRun() {
    if (world.state.totalScore > best) {
      best = world.state.totalScore;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_CONFIRM) {
        world.nextLevel();
        screen = SCREEN_PLAY;
        announce('Next job. ' + world.state.level.brief);
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sneak: false, run: false, interact: false }, true);
      return;
    }
    const move = input.move();
    const coinTarget = input.takeCoinTarget();
    // A click during play throws a coin; on a menu screen it only confirms.
    const events = world.step(STEP, {
      dx: move.dx,
      dy: move.dy,
      sneak: move.sneak,
      run: move.run,
      interact: move.interact,
      coinTarget: screen === SCREEN_PLAY ? coinTarget : null,
      smoke: screen === SCREEN_PLAY && !!(frameActions & ACTION_SMOKE),
      jam: screen === SCREEN_PLAY && !!(frameActions & ACTION_JAM),
    }, false);
    if (events & EVENT_LOOT) {
      audio.loot();
      announce('Loot secured. Reach the exit.');
    }
    if (events & EVENT_PICKED) audio.pick();
    if (events & EVENT_JAM) {
      audio.jam();
      announce('Camera jammed — six seconds of dark.');
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('Spotted! Break line of sight — the alarm is climbing.');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      finishRun();
      screen = SCREEN_CAUGHT;
      announce('Caught. ' + world.state.caughtReason);
    } else if (events & EVENT_LEVEL_CLEAR) {
      audio.clear();
      screen = SCREEN_CLEAR;
      announce('Clean getaway. ' + world.state.level.loot.name + ' secured.');
    } else if (events & EVENT_WIN) {
      audio.clear();
      finishRun();
      screen = SCREEN_WIN;
      announce('The perfect night. All three jobs done.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    frameActions = handleActions();
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        step();
        accumulator -= STEP;
      }
    } else {
      input.takeCoinTarget();
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight at the Marlowe. Press Enter or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
