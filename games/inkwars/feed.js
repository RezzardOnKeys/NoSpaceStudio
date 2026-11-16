// Inkwars – the guest's keys on the host. The guest moves its own character
// at once on its own screen (guest.js), in the same small steps as the rules
// (STEP), and sends the keys of every step, numbered. The host plays every
// one of them exactly once and in the same order, so its copy of the guest's
// character walks the same way as the guest's own, only a little later.
// Which step it played last goes back to the guest (ack), which compares
// and corrects.
//
// The network does not deliver evenly. So the guest's character is not moved
// by sim.step() but here (Actor.external): one step of the guest per step of
// the rules, two or three when keys pile up, none while no keys are there
// (the character then waits a moment).

import { REWIND_MAX } from './config.js';
import { unpackInput, seenOf } from './wire.js';

// With more waiting steps than this the guest's character catches up faster.
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
     * Before every step of the rules: moves the guest's character by the
     * waiting steps (see above). time is the clock of the rules at the end
     * of this step; it tells how far back the guest's shots are judged
     * (Actor.rewind).
     */
    play(actor, sim, step, time) {
      const n = queue.length === 0 ? 0 : queue.length <= CALM ? 1 : queue.length <= BUSY ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const { seq, list } = queue.shift();
        unpackInput(actor.input, list);
        const seen = seenOf(list);
        actor.rewind = seen === null ? 0 : Math.min(REWIND_MAX, Math.max(0, time - seen));
        sim.updateActor(actor, step);
        feed.ack = seq;
      }
    },
  };
  return feed;
}
