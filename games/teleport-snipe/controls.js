// Teleport Snipe – keyboard and mouse. Keeps the list of pressed keys, the
// view direction (yaw and pitch) and catches the mouse inside the game
// ("pointer lock"), so it can turn the view without leaving the window.

import { CONFIG } from './config.js';

const PITCH_MIN = -1.45;
const PITCH_MAX = 1.45;
// Keys the browser would otherwise use to scroll or to move the focus.
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
// Mouse speed from the slider in the menu, remembered in this browser.
// 1 is the normal speed; the same range as in the other games.
const SPEED_KEY = 'teleport-snipe-mouse-speed';
const SPEED = { min: 0.3, max: 3, step: 0.1 };

function loadSpeed() {
  try {
    const saved = Number.parseFloat(localStorage.getItem(SPEED_KEY));
    if (saved >= SPEED.min && saved <= SPEED.max) return saved;
  } catch {
    // Storage can be blocked; the normal speed is fine then.
  }
  return 1;
}

/** inMatch() tells whether a match is running (only then keys belong to the game). */
export function createControls(canvas, inMatch) {
  const keys = new Set();
  const clampPitch = (p) => Math.max(PITCH_MIN, Math.min(PITCH_MAX, p));
  const c = {
    yaw: 0,
    pitch: 0,
    speed: loadSpeed(),
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

    /** Connects the mouse speed slider (a range input) and its value label. */
    bindSpeedSlider(input, label) {
      input.min = String(SPEED.min);
      input.max = String(SPEED.max);
      input.step = String(SPEED.step);
      const show = () => {
        input.value = String(c.speed);
        label.textContent = `${c.speed.toFixed(1)}×`;
        // How far the track is filled, used by the slider's look.
        input.style.setProperty('--fill', `${((c.speed - SPEED.min) / (SPEED.max - SPEED.min)) * 100}%`);
      };
      show();
      input.addEventListener('input', () => {
        c.speed = Number.parseFloat(input.value);
        show();
        try {
          localStorage.setItem(SPEED_KEY, String(c.speed));
        } catch {
          // Not saved, but it still applies until the game is closed.
        }
      });
    },

    /** The arrow keys turn the view too, for players without a mouse. */
    turnWithKeys(dt) {
      const L = CONFIG.look;
      const k = (code) => (keys.has(code) ? 1 : 0);
      c.yaw += (k('ArrowLeft') - k('ArrowRight')) * L.keyTurn * dt;
      c.pitch = clampPitch(c.pitch + (k('ArrowUp') - k('ArrowDown')) * L.keyTurn * 0.6 * dt);
    },
  };

  canvas.addEventListener('mousedown', () => {
    if (inMatch() && !c.locked()) c.lock();
  });
  window.addEventListener('mousemove', (e) => {
    if (!c.locked()) return;
    c.yaw -= e.movementX * CONFIG.look.mouseSens * c.speed;
    c.pitch = clampPitch(c.pitch - e.movementY * CONFIG.look.mouseSens * c.speed);
  });
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (inMatch() && GAME_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  return c;
}
