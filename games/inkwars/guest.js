// Inkwars – the guest's copy of a party match. The guest's browser does not
// run the rules. It repeats what the referee (host.js) reports: where the
// characters are, which water drops fly and which splats land. Because every
// splat is repeated exactly, both players see the same painted arena.

import { CONFIG } from './config.js';
import { unpackActor } from './wire.js';

// A snapshot arrives about 30 times per second. Between two of them a
// character keeps moving with its last speed, at most this long (seconds).
const MAX_AHEAD = 0.1;
// How quickly the shown position closes in on the reported one.
const CATCH_UP = 22;
// A jump further than this (metres) is a respawn: do not glide there.
const TELEPORT = 5;

const num = (v) => (Number.isFinite(v) ? v : 0);

export function createMirror({ sim, paint }) {
  let targets = [];
  let age = 0;

  const mirror = {
    state: 'menu',
    timeLeft: 0,
    countdown: 0,

    /** Sets up the same characters, in the same order, as the referee's start(). */
    start(teamSize) {
      sim.actors = [];
      sim.projectiles = [];
      sim.events = [];
      paint.reset();
      for (let slot = 0; slot < teamSize; slot++) {
        for (const team of [1, 2]) sim.addActor(team, slot, false);
      }
      targets = sim.actors.map((a) => a.pos.clone());
      mirror.timeLeft = CONFIG.match.duration;
      mirror.countdown = CONFIG.match.countdown;
      mirror.state = 'countdown';
    },

    /** Takes over a snapshot. me is the guest's own character. Returns the events in it. */
    onSnap(msg, me) {
      if (!Array.isArray(msg.a) || mirror.state === 'menu') return [];
      if (msg.s === 'countdown' || msg.s === 'playing' || msg.s === 'ended') mirror.state = msg.s;
      mirror.timeLeft = num(msg.tl);
      mirror.countdown = num(msg.cd);
      age = 0;
      sim.actors.forEach((a, i) => {
        const list = msg.a[i];
        if (!Array.isArray(list)) return;
        const wasAlive = a.alive;
        unpackActor(a, list, a === me);
        targets[i].set(num(list[0]), num(list[1]), num(list[2]));
        if (!wasAlive || a.pos.distanceTo(targets[i]) > TELEPORT) a.pos.copy(targets[i]);
      });
      if (Array.isArray(msg.ops)) for (const op of msg.ops) if (Array.isArray(op)) paint.apply(op);
      if (Array.isArray(msg.shots)) {
        for (const s of msg.shots) {
          if (Array.isArray(s))
            sim.addProjectile(s[0], s[1], s[2], s[3], s[4], s[5], s[6] === 2 ? 2 : 1, null);
        }
      }
      return Array.isArray(msg.ev) ? msg.ev.filter(Array.isArray) : [];
    },

    /** Every frame: glide the characters towards their reported positions, fly the water. */
    update(dt) {
      if (mirror.state !== 'countdown' && mirror.state !== 'playing') return;
      age += dt;
      const ahead = Math.min(age, MAX_AHEAD);
      const k = 1 - Math.exp(-dt * CATCH_UP);
      sim.actors.forEach((a, i) => {
        const t = targets[i];
        a.pos.x += (t.x + a.vel.x * ahead - a.pos.x) * k;
        a.pos.y += (t.y - a.pos.y) * k;
        a.pos.z += (t.z + a.vel.z * ahead - a.pos.z) * k;
      });
      sim.updateProjectiles(dt);
    },

    toMenu() {
      mirror.state = 'menu';
      sim.projectiles = [];
    },
  };
  return mirror;
}
