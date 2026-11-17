// Teleport Snipe – the guest's copy of a party match. The host's referee
// (host.js) decides everything; this copy takes over what the host reports
// about 30 times per second. Between two reports the countdown runs on by
// itself, so it does not stutter. The guest's own movement ahead of the
// host is added in step 5 of the plan; for now the guest moves its own
// player on its own screen with the same rules (sim.js).

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import { createPlayer, placePlayer, movePlayer, createDummies, tickDummies, fireShot } from './sim.js';

const STATES = ['countdown', 'playing'];
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

/** mySeat: the guest's own seat; only that player is moved here. */
export function createMirror({ mySeat }) {
  let stepTime = 0;
  const mirror = {
    state: 'menu', // menu | countdown | playing
    round: 1,
    countdown: 0,
    scores: [0, 0],
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    dummies: createDummies(), // straw targets until the bot exists (map.js)
    get between() {
      return mirror.state === 'playing' ? stepTime / STEP : 1;
    },

    /** A match begins (the host's "start" message). */
    start() {
      mirror.round = 1;
      mirror.scores = new Array(MAX_PLAYERS).fill(0);
      mirror.dummies = createDummies();
      mirror.beginRound();
    },

    /** Everybody back to their start points. */
    beginRound() {
      for (const p of mirror.players) placePlayer(p, startOf(p.seat, mirror.round));
      mirror.countdown = CONFIG.match.countdown;
      stepTime = 0;
      mirror.state = 'countdown';
    },

    step(dt) {
      const me = mirror.players[mySeat];
      if (mirror.state === 'countdown') {
        me.yaw = me.input.yaw;
        mirror.countdown = Math.max(0, mirror.countdown - dt);
      } else if (mirror.state === 'playing') {
        stepTime += dt;
        while (stepTime >= STEP) {
          movePlayer(me, STEP);
          tickDummies(mirror.dummies, STEP);
          stepTime -= STEP;
        }
      }
    },

    toMenu() {
      mirror.state = 'menu';
    },

    /**
     * The guest shoots. Until step 5 of the plan the shot is decided on the
     * guest's own screen; then the host will decide it.
     */
    shoot(seat, shot) {
      if (mirror.state !== 'playing') return null;
      return fireShot(mirror.players[seat], shot, mirror.players, mirror.dummies);
    },

    /** Takes over a report from the host. Every value is checked: it comes from another computer. */
    onSnap(msg) {
      if (STATES.includes(msg.s)) mirror.state = msg.s;
      mirror.countdown = Math.min(CONFIG.match.countdown, Math.max(0, num(msg.cd)));
      const round = Math.max(1, Math.round(num(msg.r, 1)));
      if (round !== mirror.round) {
        // A new round (or a guest who reloaded joins a later one): back to the start points.
        mirror.round = round;
        for (const p of mirror.players) placePlayer(p, startOf(p.seat, round));
      }
      if (Array.isArray(msg.sc)) {
        mirror.scores = mirror.scores.map((_, i) =>
          Math.min(CONFIG.match.roundsToWin, Math.max(0, Math.round(num(msg.sc[i])))),
        );
      }
    },
  };
  return mirror;
}
