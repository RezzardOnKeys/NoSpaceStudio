// Teleport Snipe – keyboard and mouse. Keeps the list of pressed keys, the
// view direction (yaw and pitch), the rifle's buttons (hold the right
// button or Q to zoom, left click or E to shoot) and catches the mouse
// inside the game ("pointer lock"), so it can turn the view without
// leaving the window.

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
  let shotQueued = false;
  const c = {
    yaw: 0,
    pitch: 0,
    speed: loadSpeed(),
    // While zoomed the mouse turns the view slower by this factor, so aiming
    // feels the same at every zoom level (set by game.js every frame).
    zoomScale: 1,
    zoomHeld: false, // the right mouse button is held
    down: (code) => keys.has(code),
    /** True once for every press of the trigger (left click or E). */
    takeShot() {
      const fire = shotQueued;
      shotQueued = false;
      return fire;
    },
    /** Zoom is wanted: right mouse button or Q held. */
    zooming: () => c.zoomHeld || keys.has('KeyQ'),
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
      const turn = L.keyTurn * c.zoomScale * dt;
      c.yaw += (k('ArrowLeft') - k('ArrowRight')) * turn;
      c.pitch = clampPitch(c.pitch + (k('ArrowUp') - k('ArrowDown')) * turn * 0.6);
    },
  };

  canvas.addEventListener('mousedown', (e) => {
    if (!inMatch()) return;
    // The first click only catches the mouse; it does not shoot.
    if (!c.locked()) {
      c.lock();
      return;
    }
    if (e.button === 0) shotQueued = true;
    if (e.button === 2) c.zoomHeld = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) c.zoomHeld = false;
  });
  // The right button belongs to the zoom, not to the browser's menu.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    if (!c.locked()) c.zoomHeld = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!c.locked()) return;
    const sens = CONFIG.look.mouseSens * c.speed * c.zoomScale;
    c.yaw -= e.movementX * sens;
    c.pitch = clampPitch(c.pitch - e.movementY * sens);
  });
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (inMatch() && e.code === 'KeyE' && !e.repeat) shotQueued = true;
    if (inMatch() && GAME_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    c.zoomHeld = false;
  });

  return c;
}
