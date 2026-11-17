// Teleport Snipe – the referee. It runs the match: the countdown before a
// round, the rounds and the score. It exists only in one browser: your own
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

import { CONFIG, MAX_PLAYERS } from './config.js';

export function createReferee() {
  const ref = {
    state: 'menu', // menu | countdown | playing
    round: 1, // the round being played (1, 2, 3, ...)
    countdown: 0, // seconds left before the round starts
    scores: [0, 0], // won rounds per seat

    /** Starts a new match with round 1. */
    start() {
      ref.round = 1;
      ref.scores = new Array(MAX_PLAYERS).fill(0);
      ref.countdown = CONFIG.match.countdown;
      ref.state = 'countdown';
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        ref.countdown -= dt;
        if (ref.countdown <= 0) {
          ref.countdown = 0;
          ref.state = 'playing';
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
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
