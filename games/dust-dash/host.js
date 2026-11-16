// Dust Dash – the referee. It runs the match: countdown, clock and scores
// (later also the dirt, the deliveries, the power-ups and the bot). It
// exists only in one browser: your own in a match alone, the party host's
// in a party match. The guest's browser decides nothing; it shows what the
// referee reports (guest.js), so two screens can never disagree about the
// score.
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
//     { t: 'start', colors }        a match begins (or goes on after a reload)
//     { t: 'snap', s, tl, cd, sc }  the state of the match, see snapshot() below
//     { t: 'end', sc }              time is up; sc = the scores of all players
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG } from './config.js';

export function createReferee() {
  const ref = {
    state: 'menu', // menu | countdown | playing | ended
    timeLeft: 0,
    countdown: 0,
    scores: [], // one number per player, in the order of the seats

    /** Starts a match for this many players (people and bots together). */
    start(playerCount) {
      ref.scores = new Array(playerCount).fill(0);
      ref.timeLeft = CONFIG.match.duration;
      ref.countdown = CONFIG.match.countdown;
      ref.state = 'countdown';
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        ref.countdown -= dt;
        if (ref.countdown <= 0) ref.state = 'playing';
      } else if (ref.state === 'playing') {
        ref.timeLeft -= dt;
        if (ref.timeLeft <= 0) {
          ref.timeLeft = 0;
          ref.state = 'ended';
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
    },

    /** The state of the match for the guest. */
    snapshot() {
      return { t: 'snap', s: ref.state, tl: ref.timeLeft, cd: ref.countdown, sc: ref.scores };
    },
  };
  return ref;
}
