// Dust Dash – keyboard and mouse. Keeps the list of pressed keys, the view
// direction (yaw and pitch) and catches the mouse inside the game
// ("pointer lock"), so it can turn the view without leaving the window.

import { CONFIG } from './config.js';

const PITCH_MIN = -1.3;
const PITCH_MAX = 1.3;
// Keys the browser would otherwise use to scroll or to move the focus.
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** inMatch() tells whether a match is running (only then keys belong to the game). */
export function createControls(canvas, inMatch) {
  const keys = new Set();
  const c = {
    yaw: 0,
    pitch: 0,
    mouseDown: false,
    down: (code) => keys.has(code),
    locked: () => document.pointerLockElement === canvas,

    lock() {
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch {
        /* without pointer lock the arrow keys still turn the view */
      }
    },
    unlock() {
      if (document.exitPointerLock) document.exitPointerLock();
    },

    /** The arrow keys turn the view too, for players without a mouse. */
    turnWithKeys(dt) {
      const L = CONFIG.look;
      const k = (code) => (keys.has(code) ? 1 : 0);
      c.yaw += (k('ArrowLeft') - k('ArrowRight')) * L.keyTurn * dt;
      c.pitch = clampPitch(c.pitch + (k('ArrowUp') - k('ArrowDown')) * L.keyTurn * 0.6 * dt);
    },
  };
  const clampPitch = (p) => Math.max(PITCH_MIN, Math.min(PITCH_MAX, p));

  canvas.addEventListener('mousedown', (e) => {
    if (!inMatch()) return;
    if (!c.locked()) c.lock();
    if (e.button === 0) c.mouseDown = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) c.mouseDown = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!c.locked()) return;
    c.yaw -= e.movementX * CONFIG.look.mouseSens;
    c.pitch = clampPitch(c.pitch - e.movementY * CONFIG.look.mouseSens);
  });
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (inMatch() && GAME_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    c.mouseDown = false;
  });

  return c;
}
