// Teleport Snipe – the guest's copy of a party match. The host's referee
// (host.js) decides everything; this copy takes over what the host reports
// about 30 times per second (state, countdown, round, score, the hit that
// ended a round). Between two reports the countdown runs on by itself, so
// it does not stutter. The guest moves its own player on its own screen
// with the same rules (sim.js), and a miss teleports it at once to the
// spot that comes from the match's seed (the host lands it on the same
// spot). Correcting the guest's position and letting the host decide the
// guest's hits are added in step 5 of the plan.

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import { createPlayer, placePlayer, movePlayer, createDummies, tickDummies, resolveShot } from './sim.js';

const STATES = ['countdown', 'playing', 'slowmo', 'card', 'ended'];
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const validSeat = (v) => Number.isInteger(v) && v >= 0 && v < MAX_PLAYERS;

/** mySeat: the guest's own seat; only that player is moved here. */
export function createMirror({ mySeat }) {
  let stepTime = 0;
  const mirror = {
    state: 'menu', // menu | countdown | playing | slowmo | card | ended
    round: 1,
    countdown: 0,
    scores: [0, 0],
    seed: 1,
    kill: null, // { victim, shooter } of the hit that ended the round
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    dummies: createDummies(), // straw targets until the bot exists (map.js)
    events: [], // like the referee's: { type: 'teleport', seat, from, to }
    get between() {
      return mirror.state === 'playing' || mirror.state === 'slowmo' ? stepTime / STEP : 1;
    },
    get speed() {
      return mirror.state === 'slowmo' ? CONFIG.match.slowmoSpeed : 1;
    },

    /** A match begins (the host's "start" message). */
    start(seed) {
      mirror.seed = seed;
      mirror.round = 1;
      mirror.scores = new Array(MAX_PLAYERS).fill(0);
      mirror.dummies = createDummies();
      for (const p of mirror.players) p.shots = 0;
      mirror.beginRound();
    },

    /** Everybody back to their start points. */
    beginRound() {
      for (const p of mirror.players) placePlayer(p, startOf(p.seat, mirror.round));
      mirror.countdown = CONFIG.match.countdown;
      mirror.kill = null;
      stepTime = 0;
      mirror.state = 'countdown';
    },

    step(dt) {
      const me = mirror.players[mySeat];
      if (mirror.state === 'countdown') {
        me.yaw = me.input.yaw;
        mirror.countdown = Math.max(0, mirror.countdown - dt);
      } else if (mirror.state === 'playing' || mirror.state === 'slowmo') {
        stepTime += dt * mirror.speed;
        while (stepTime >= STEP) {
          if (me.alive) movePlayer(me, STEP);
          tickDummies(mirror.dummies, STEP);
          stepTime -= STEP;
        }
      }
    },

    toMenu() {
      mirror.state = 'menu';
    },

    /**
     * The guest shoots. A miss teleports the guest at once. Until step 5
     * of the plan a hit on the host only shows the hit marker; then the
     * host will decide it.
     */
    shoot(seat, shot) {
      if (mirror.state !== 'playing') return null;
      const out = resolveShot(mirror.seed, mirror.players[seat], shot, mirror.players, mirror.dummies);
      if (out && out.to) mirror.events.push({ type: 'teleport', seat, from: out.from, to: out.to });
      return out;
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
      const k = Array.isArray(msg.k) && validSeat(msg.k[0]) && validSeat(msg.k[1]) ? msg.k : null;
      mirror.kill = k ? { victim: k[0], shooter: k[1] } : null;
      for (const p of mirror.players) p.alive = !k || k[0] !== p.seat;
    },
  };
  return mirror;
}
