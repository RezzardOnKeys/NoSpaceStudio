// Dust Dash – the guest's copy of a party match. The host's browser is the
// referee (host.js); the guest takes over what the referee reports and lets
// the clock run on by itself between two reports, so it counts evenly.
// It has the same shape as the referee, so game.js can use either.

import { CONFIG } from './config.js';

const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);

export function createMirror() {
  const mirror = {
    state: 'menu', // menu | countdown | playing | ended
    timeLeft: 0,
    countdown: 0,
    scores: [],

    start(playerCount) {
      mirror.scores = new Array(playerCount).fill(0);
      mirror.timeLeft = CONFIG.match.duration;
      mirror.countdown = CONFIG.match.countdown;
      mirror.state = 'countdown';
    },

    /** A report from the referee (message 'snap'). */
    onSnap(msg) {
      if (msg.s === 'countdown' || msg.s === 'playing' || msg.s === 'ended') mirror.state = msg.s;
      mirror.timeLeft = num(msg.tl, mirror.timeLeft);
      mirror.countdown = num(msg.cd, mirror.countdown);
      if (Array.isArray(msg.sc)) {
        mirror.scores = mirror.scores.map((old, i) => Math.max(0, Math.round(num(msg.sc[i], old))));
      }
    },

    /** Lets the clock run between two reports. */
    step(dt) {
      if (mirror.state === 'countdown') mirror.countdown = Math.max(0, mirror.countdown - dt);
      else if (mirror.state === 'playing') mirror.timeLeft = Math.max(0, mirror.timeLeft - dt);
    },

    toMenu() {
      mirror.state = 'menu';
    },
  };
  return mirror;
}
