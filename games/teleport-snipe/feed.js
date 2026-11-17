// Teleport Snipe – the guest's keys on the host. The guest moves its own
// player at once on its own screen (guest.js), in the same small steps as
// the rules (STEP), and sends the keys of every step, numbered. The host
// plays every one of them exactly once and in the same order, so its copy
// of the guest walks the same way as the guest's own, only a little later.
// Which step it played last goes back to the guest (ack), which compares
// and corrects.
//
// The network does not deliver evenly. So the guest's player is not moved
// by the referee's own loop but here: one step of the guest per step of the
// rules, two or three when keys pile up, none while no keys are there (the
// player then waits a moment).

import { STEP } from './config.js';
import { movePlayer } from './sim.js';
import { unpackInput } from './wire.js';

// With more waiting steps than this the guest's player catches up faster.
const CALM = 4;
const BUSY = 10;

export function createFeed() {
  let queue = [];
  let lastSeq = -1;

  const feed = {
    /** The number of the last step played; -1 = none yet. */
    ack: -1,

    reset() {
      queue = [];
      lastSeq = -1;
      feed.ack = -1;
    },

    /** Steps from the network: first is the number of the first list. */
    push(first, lists) {
      if (!Number.isInteger(first) || !Array.isArray(lists)) return;
      lists.slice(0, 60).forEach((list, i) => {
        const seq = first + i;
        if (seq > lastSeq && Array.isArray(list)) {
          lastSeq = seq;
          queue.push({ seq, list });
        }
      });
    },

    /**
     * Before every step of the rules: moves the guest's player by the
     * waiting steps (see above). afterStep(seq) is called after each one
     * (the referee then decides the guest's shots of that step).
     */
    play(player, afterStep) {
      const n = queue.length === 0 ? 0 : queue.length <= CALM ? 1 : queue.length <= BUSY ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const { seq, list } = queue.shift();
        unpackInput(player.input, list);
        if (player.alive) movePlayer(player, STEP);
        feed.ack = seq;
        afterStep(seq);
      }
    },
  };
  return feed;
}
