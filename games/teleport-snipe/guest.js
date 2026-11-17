// Teleport Snipe – the guest's copy of a party match. The host's referee
// (host.js) decides everything; this copy takes over what the host reports
// about 30 times per second. Between two reports the countdown runs on by
// itself, so it does not stutter. The guest's own movement ahead of the
// host is added in step 5 of the plan.

import { CONFIG, MAX_PLAYERS } from './config.js';

const STATES = ['countdown', 'playing'];
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export function createMirror() {
  const mirror = {
    state: 'menu', // menu | countdown | playing
    round: 1,
    countdown: 0,
    scores: [0, 0],

    /** A match begins (the host's "start" message). */
    start() {
      mirror.round = 1;
      mirror.scores = new Array(MAX_PLAYERS).fill(0);
      mirror.countdown = CONFIG.match.countdown;
      mirror.state = 'countdown';
    },

    step(dt) {
      if (mirror.state === 'countdown') mirror.countdown = Math.max(0, mirror.countdown - dt);
    },

    toMenu() {
      mirror.state = 'menu';
    },

    /** Takes over a report from the host. Every value is checked: it comes from another computer. */
    onSnap(msg) {
      if (STATES.includes(msg.s)) mirror.state = msg.s;
      mirror.countdown = Math.min(CONFIG.match.countdown, Math.max(0, num(msg.cd)));
      mirror.round = Math.max(1, Math.round(num(msg.r, 1)));
      if (Array.isArray(msg.sc)) {
        mirror.scores = mirror.scores.map((_, i) =>
          Math.min(CONFIG.match.roundsToWin, Math.max(0, Math.round(num(msg.sc[i])))),
        );
      }
    },
  };
  return mirror;
}
