// Millpond – the guest's copy of a party game. It follows what the referee
// (host.js, in the host's browser) reports. The guest's own moves are
// checked with the same rules and shown at once, without waiting for the
// network; the referee then confirms them. If the copy ever gets out of step
// (a lost message, a move the referee did not accept), it asks for the whole
// game again and starts over from that.

import { createRules, unpackMove, packMove, validResult, other } from './rules.js';

export function createCopy() {
  const rules = createRules();

  const copy = {
    rules,
    state: 'menu', // menu | playing | ended
    mySide: 's',
    hostName: 'Host',
    result: null,

    /**
     * The whole game from the host ('game' message). Returns false if the
     * message makes no sense; the guest then stays where it is.
     */
    onGame(msg) {
      if (!Array.isArray(msg.mv) || msg.mv.length > 5000) return false;
      // Checked on a spare game first, so a broken message leaves the copy as it was.
      if (!createRules().reset(msg.mv)) return false;
      rules.reset(msg.mv);
      copy.mySide = other(msg.hs === 's' ? 's' : 'l');
      copy.hostName = cleanName(msg.hostName);
      copy.result = validResult(msg.r) || rules.outcome();
      copy.state = copy.result ? 'ended' : 'playing';
      return true;
    },

    /**
     * A 'move' message from the host. Returns
     *   { done }    a new move to show,
     *   'known'     the confirmation of a move this copy already has,
     *   'resync'    out of step: send { t: 'sync' } and wait for 'game'.
     */
    onMove(msg) {
      if (copy.state === 'menu') return 'known';
      const plies = rules.plies;
      if (msg.n === plies - 1 && rules.packed()[plies - 1] === msg.m) return 'known';
      if (msg.n !== plies || copy.result) return 'resync';
      const done = rules.move(unpackMove(msg.m));
      if (!done) return 'resync';
      copy.checkEnd();
      return { done };
    },

    /** The 'end' message: the referee's word on how the game ended. */
    onEnd(msg) {
      const r = validResult(msg.r);
      if (!r || copy.state === 'menu') return false;
      copy.result = r;
      copy.state = 'ended';
      return true;
    },

    /**
     * The guest plays move m. Returns what happened (for the picture) and
     * the message for the host, or null if not allowed.
     */
    tryMove(m) {
      if (copy.state !== 'playing' || rules.turn !== copy.mySide) return null;
      const n = rules.plies;
      const done = rules.move(m);
      if (!done) return null;
      copy.checkEnd();
      return { done, msg: { t: 'move', n, m: packMove(m) } };
    },

    checkEnd() {
      const r = rules.outcome();
      if (r) {
        copy.result = r;
        copy.state = 'ended';
      }
    },

    toMenu() {
      copy.state = 'menu';
      copy.result = null;
    },
  };
  return copy;
}

export const cleanName = (v) => (typeof v === 'string' ? v.trim().slice(0, 20) : '') || 'Player';
