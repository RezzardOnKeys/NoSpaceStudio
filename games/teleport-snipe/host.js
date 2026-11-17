// Teleport Snipe – the referee. It runs the match: the countdown before a
// round, the rounds and the score, and it moves the players with the rules
// of sim.js in fixed steps. It exists only in one browser: your own
// in a match alone, the party host's in a party match. The guest's browser
// decides nothing that counts; it shows what the referee reports
// (guest.js). Shots, hits, teleports and the bot are added here in the
// next steps of the plan (docs/TELEPORT-SNIPE.md).
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
//     { t: 'start', hostName, colors }          a match begins (or goes on
//                                   after the guest reloaded)
//     { t: 'snap', s, cd, r, sc }   the state of the match, see snapshot() below
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import { createPlayer, placePlayer, movePlayer, createDummies, tickDummies, fireShot } from './sim.js';

/** localSeats: the seats whose keys are read in this browser. */
export function createReferee({ localSeats }) {
  let stepTime = 0; // time not yet used up by whole steps of the rules
  const ref = {
    state: 'menu', // menu | countdown | playing
    round: 1, // the round being played (1, 2, 3, ...)
    countdown: 0, // seconds left before the round starts
    scores: [0, 0], // won rounds per seat
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    dummies: createDummies(), // straw targets until the bot exists (map.js)
    /** How far the picture is between the last two steps of the rules (0..1). */
    get between() {
      return ref.state === 'playing' ? stepTime / STEP : 1;
    },

    /** Starts a new match with round 1. */
    start() {
      ref.round = 1;
      ref.scores = new Array(MAX_PLAYERS).fill(0);
      ref.dummies = createDummies();
      ref.beginRound();
    },

    /** Everybody back to their start points, then the countdown. */
    beginRound() {
      for (const p of ref.players) placePlayer(p, startOf(p.seat, ref.round));
      ref.countdown = CONFIG.match.countdown;
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
      } else if (ref.state === 'playing') {
        stepTime += dt;
        while (stepTime >= STEP) {
          for (const seat of localSeats) movePlayer(ref.players[seat], STEP);
          tickDummies(ref.dummies, STEP);
          stepTime -= STEP;
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
    },

    /** A player shoots (see fireShot in sim.js); only while a round is played. */
    shoot(seat, shot) {
      if (ref.state !== 'playing') return null;
      return fireShot(ref.players[seat], shot, ref.players, ref.dummies);
    },

    /** The state of the match for the guest. */
    snapshot() {
      return {
        t: 'snap',
        s: ref.state,
        cd: Math.round(ref.countdown * 1000) / 1000,
        r: ref.round,
        sc: ref.scores,
      };
    },
  };
  return ref;
}
