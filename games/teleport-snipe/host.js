// Teleport Snipe – the referee. It runs the match: the countdown before a
// round, the players' movement (sim.js, in fixed steps), the shots with
// their teleports, the hit that ends a round, the slow motion, the round
// card and the score up to "first to 3". It exists only in one browser:
// your own in a match alone, the party host's in a party match. The
// guest's browser decides nothing that counts; it shows what the referee
// reports (guest.js). The bot is added in step 6 of the plan.
//
// A round goes: countdown (3 s) -> playing -> slowmo (1.5 s at a quarter
// of the speed after the hit) -> card (2.5 s) -> the next round's
// countdown, or ended when a player has won 3 rounds.
//
// All messages of a party match (sent in game.js):
//
//   guest -> host
//     { t: 'hello', name, color }   after connecting; color = wanted palette index
//     { t: 'color', color }         picked another colour in the menu
//     { t: 'ready', ready }         pressed "Ready"
//
//   host -> guest
//     { t: 'lobby', hostName, colors, ready }   the menu; also "back to the menu"
//     { t: 'start', hostName, colors, seed }    a match begins (or goes on
//                                   after the guest reloaded); seed = the
//                                   number all teleport spots come from
//     { t: 'snap', s, cd, r, sc, k }   the state of the match, see snapshot() below
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import { createPlayer, placePlayer, movePlayer, createDummies, tickDummies, resolveShot } from './sim.js';

/** localSeats: the seats whose keys are read in this browser. */
export function createReferee({ localSeats }) {
  let stepTime = 0; // time not yet used up by whole steps of the rules
  let timer = 0; // seconds left in the slow motion or of the round card
  const ref = {
    state: 'menu', // menu | countdown | playing | slowmo | card | ended
    round: 1, // the round being played (1, 2, 3, ...)
    countdown: 0, // seconds left before the round starts
    scores: [0, 0], // won rounds per seat
    seed: 1, // the number all teleport spots of this match come from
    kill: null, // the hit that ended the last round: { victim, shooter }
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    dummies: createDummies(), // straw targets until the bot exists (map.js)
    // What happened since game.js last looked: { type: 'teleport', seat, from, to }
    events: [],
    /** How far the picture is between the last two steps of the rules (0..1). */
    get between() {
      return ref.state === 'playing' || ref.state === 'slowmo' ? stepTime / STEP : 1;
    },
    /** How fast the game runs right now (a quarter in slow motion). */
    get speed() {
      return ref.state === 'slowmo' ? CONFIG.match.slowmoSpeed : 1;
    },

    /** Starts a new match with round 1; seed: see random.js. */
    start(seed) {
      ref.seed = seed;
      ref.round = 1;
      ref.scores = new Array(MAX_PLAYERS).fill(0);
      ref.dummies = createDummies();
      for (const p of ref.players) p.shots = 0;
      ref.beginRound();
    },

    /** Everybody back to their start points, then the countdown. */
    beginRound() {
      for (const p of ref.players) placePlayer(p, startOf(p.seat, ref.round));
      ref.countdown = CONFIG.match.countdown;
      ref.kill = null;
      stepTime = 0;
      ref.state = 'countdown';
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        // Nobody can move yet, but everybody may already look around.
        for (const p of ref.players) p.yaw = p.input.yaw;
        ref.countdown -= dt;
        if (ref.countdown <= 0) {
          ref.countdown = 0;
          ref.state = 'playing';
        }
      } else if (ref.state === 'playing' || ref.state === 'slowmo') {
        stepTime += dt * ref.speed;
        while (stepTime >= STEP) {
          for (const seat of localSeats) {
            const p = ref.players[seat];
            if (p.alive) movePlayer(p, STEP);
          }
          tickDummies(ref.dummies, STEP);
          stepTime -= STEP;
        }
        if (ref.state === 'slowmo') {
          timer -= dt;
          if (timer <= 0) {
            ref.state = 'card';
            timer = CONFIG.match.cardTime;
          }
        }
      } else if (ref.state === 'card') {
        timer -= dt;
        if (timer <= 0) {
          if (Math.max(...ref.scores) >= CONFIG.match.roundsToWin) {
            ref.state = 'ended';
          } else {
            ref.round += 1;
            ref.beginRound();
          }
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
    },

    /**
     * A player shoots (see resolveShot in sim.js); only while a round is
     * played. A hit on the other player ends the round at once; any other
     * shot teleports the shooter.
     */
    shoot(seat, shot) {
      if (ref.state !== 'playing') return null;
      const out = resolveShot(ref.seed, ref.players[seat], shot, ref.players, ref.dummies);
      if (!out) return null;
      if (out.victim >= 0) {
        ref.players[out.victim].alive = false;
        ref.scores[seat] += 1;
        ref.kill = { victim: out.victim, shooter: seat };
        ref.state = 'slowmo';
        timer = CONFIG.match.slowmo;
      } else {
        ref.events.push({ type: 'teleport', seat, from: out.from, to: out.to });
      }
      return out;
    },

    /**
     * The state of the match for the guest. k: the hit that ended the
     * round as [victim, shooter], or null.
     */
    snapshot() {
      return {
        t: 'snap',
        s: ref.state,
        cd: Math.round(ref.countdown * 1000) / 1000,
        r: ref.round,
        sc: ref.scores,
        k: ref.kill ? [ref.kill.victim, ref.kill.shooter] : null,
      };
    },
  };
  return ref;
}
