// Blockchess – the referee of a party game. It exists only in the party
// host's browser. It holds the one true game: which side the host plays,
// every move and how the game ended. The guest's browser checks its own
// moves with the same rules so they show at once (guest.js), but a move
// only counts when the referee has accepted it. Alone against the computer
// there is no referee: game.js uses the rules (rules.js) directly.
//
// All messages of a party game (sent in game.js):
//
//   guest -> host
//     { t: 'hello', name }       after connecting (also after a reload)
//     { t: 'ready', ready }      pressed "Ready" in the menu
//     { t: 'move', n, m }        wants to play move text m as half move
//                                number n (0 = White's first move)
//     { t: 'resign' }            gives up the running game
//     { t: 'sync' }              its copy got out of step: please send 'game'
//
//   host -> guest
//     { t: 'lobby', hostName, side, ready }  the menu; side = what the host
//                                plays: 'w', 'b' or 'r' (random). Also
//                                means "back to the menu"
//     { t: 'game', hostName, hc, mv, r }     a game begins, or the whole
//                                game for a guest who (re)joins or got out
//                                of step: hc = the host's side, mv = all move
//                                texts so far, r = the result or null
//     { t: 'move', n, m }        move text m was played as half move n
//                                (the host's moves and accepted guest moves)
//     { t: 'end', r }            the game is over; r = { w, why } (rules.js)
//     { t: 'full' }              a third player tried to join (net.js)
//     plus 'ping' and 'bye' from net.js

import { createRules, unpackMove, packMove, validResult } from './rules.js';

export function createReferee() {
  const rules = createRules();

  const ref = {
    rules,
    state: 'menu', // menu | playing | ended
    hostColor: 'w',
    result: null, // { w, why } once the game is over
    get guestColor() {
      return ref.hostColor === 'w' ? 'b' : 'w';
    },

    /** A new game; the host plays hostColor ('w' or 'b'). */
    start(hostColor) {
      ref.hostColor = hostColor === 'b' ? 'b' : 'w';
      rules.reset();
      ref.result = null;
      ref.state = 'playing';
    },

    toMenu() {
      ref.state = 'menu';
      ref.result = null;
    },

    /**
     * The host plays { from, to, promotion }. Returns the move (for the
     * picture) and the message for the guest, or null if not allowed.
     */
    hostMove(m) {
      if (ref.state !== 'playing' || rules.turn !== ref.hostColor) return null;
      const n = rules.plies;
      const mv = rules.move(m);
      if (!mv) return null;
      ref.checkEnd();
      return { mv, msg: { t: 'move', n, m: packMove(mv) } };
    },

    /**
     * A move message from the guest. Returns { mv, msg } when it was
     * accepted (msg goes back to the guest as confirmation), or null when it
     * was not: then the guest gets the whole game again with gameMessage().
     */
    guestMove(msg) {
      if (ref.state !== 'playing' || rules.turn !== ref.guestColor) return null;
      if (msg.n !== rules.plies) return null;
      const n = rules.plies;
      const mv = rules.move(unpackMove(msg.m));
      if (!mv) return null;
      ref.checkEnd();
      return { mv, msg: { t: 'move', n, m: packMove(mv) } };
    },

    /** Ends the game if the position decides it (mate or a draw). */
    checkEnd() {
      const r = rules.outcome();
      if (r) {
        ref.result = r;
        ref.state = 'ended';
      }
      return r;
    },

    /** The side `color` gives up. Returns the result, or null if no game runs. */
    resign(color) {
      if (ref.state !== 'playing') return null;
      ref.result = { w: color === 'w' ? 'b' : 'w', why: 'resign' };
      ref.state = 'ended';
      return ref.result;
    },

    /** The whole game for the guest. */
    gameMessage(hostName) {
      return { t: 'game', hostName, hc: ref.hostColor, mv: rules.packed(), r: ref.result };
    },

    /** What a reload of the host's tab needs to continue (sessionStorage). */
    save() {
      return { state: ref.state, hc: ref.hostColor, mv: rules.packed(), r: ref.result };
    },

    /** Continues a saved game; false if there was nothing usable. */
    restore(saved) {
      if (!saved || (saved.state !== 'playing' && saved.state !== 'ended')) return false;
      if (!Array.isArray(saved.mv) || !rules.reset(saved.mv)) return false;
      ref.hostColor = saved.hc === 'b' ? 'b' : 'w';
      ref.result = saved.state === 'ended' ? validResult(saved.r) : null;
      ref.state = ref.result ? 'ended' : 'playing';
      if (!ref.result) ref.checkEnd();
      return true;
    },
  };
  return ref;
}
