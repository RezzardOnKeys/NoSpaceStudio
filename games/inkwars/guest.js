// Inkwars – the guest's copy of a party match. The guest's browser decides
// nothing. It repeats what the referee (host.js) reports: where the other
// character is, which water drops fly and which splats land. Because every
// splat is repeated exactly, both players see the same painted arena.
//
// The guest's own character is moved here at once, with the same rules as
// on the host (Sim.updateActor on the same painted arena), so the keys react
// without delay. Every step of the rules gets a number and its keys go to
// the host (takeInputs, feed.js). The host reports which step it played
// last (k) and where the character was after it. If that differs from where
// it was here after the same step, the difference is made up softly over a
// few frames. Life, tank, being out and coming back in come from the host.

import { CONFIG, STEP } from './config.js';
import { unpackActor, packInput, unpackInput } from './wire.js';

// A snapshot arrives about 30 times per second. Between two of them the
// other character keeps moving with its last speed, at most this long (seconds).
const MAX_AHEAD = 0.1;
// How quickly the shown position of the other character closes in on the reported one.
const CATCH_UP = 22;
// A jump further than this (metres) is a respawn: do not glide there.
const TELEPORT = 5;
// Own character: how quickly a difference to the host is made up (per
// second; 8 means most of it is gone after a quarter of a second).
const FIX_RATE = 8;
// A difference larger than this (metres) is taken over at once.
const FIX_SNAP = 2;
// Steps of the own character that are remembered for the comparison (2 s).
const KEEP_STEPS = 120;

const num = (v) => (Number.isFinite(v) ? v : 0);

export function createMirror({ sim, paint }) {
  let targets = [];
  let age = 0;
  let hostTime = -1; // the clock of the rules in the newest snapshot (ms)
  // own character
  let acc = 0;
  let seq = 0;
  let firstUnsent = 0;
  let unsent = [];
  let steps = new Map(); // step number -> where the own character was after it
  let synced = false; // false until the own character stands where the host says
  const fix = { x: 0, y: 0, z: 0 };

  function resetOwn() {
    acc = 0;
    steps = new Map();
    synced = false;
    fix.x = fix.y = fix.z = 0;
  }

  /** Puts the own character exactly where the host's snapshot says. */
  function takeOver(a, list) {
    unpackActor(a, list, false);
    a.pos.set(num(list[0]), num(list[1]), num(list[2]));
    steps = new Map();
    fix.x = fix.y = fix.z = 0;
    synced = true;
  }

  /**
   * Makes up the share k of the difference to the host. A sideways move
   * that would end in a wall or outside the arena is left to the host's
   * next report instead; the character never sinks into the floor.
   */
  function softFix(a, k) {
    const ar = sim.arena;
    const r = CONFIG.move.radius;
    const lim = a.pos.y + CONFIG.move.stepHeight;
    const dx = fix.x * k;
    const dz = fix.z * k;
    const sx = Math.sign(dx);
    const sz = Math.sign(dz);
    if (dx !== 0 && ar.heightAt(a.pos.x + dx + sx * r, a.pos.z) <= lim) a.pos.x += dx;
    else if (dx !== 0) fix.x = 0;
    if (dz !== 0 && ar.heightAt(a.pos.x, a.pos.z + dz + sz * r) <= lim) a.pos.z += dz;
    else if (dz !== 0) fix.z = 0;
    fix.x -= dx;
    fix.z -= dz;
    const dy = fix.y * k;
    a.pos.y = Math.max(ar.heightAt(a.pos.x, a.pos.z), a.pos.y + dy);
    fix.y -= dy;
  }

  /** Compares the host's place after step k with the own one and starts the correction. */
  function correct(a, list, k) {
    const mine = steps.get(k);
    for (const key of steps.keys()) {
      if (key > k) break;
      steps.delete(key);
    }
    if (!mine) return;
    const ex = num(list[0]) - mine.x;
    const ey = num(list[1]) - mine.y;
    const ez = num(list[2]) - mine.z;
    // the steps after k were worked out from the old place: move them too
    for (const p of steps.values()) {
      p.x += ex;
      p.y += ey;
      p.z += ez;
    }
    if (Math.hypot(ex, ey, ez) > FIX_SNAP) {
      a.pos.set(num(list[0]), num(list[1]), num(list[2]));
      a.vel.set(num(list[3]), num(list[4]), num(list[5]));
      steps = new Map();
      fix.x = fix.y = fix.z = 0;
    } else {
      fix.x += ex;
      fix.y += ey;
      fix.z += ez;
    }
  }

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
      hostTime = -1;
      seq = 0;
      firstUnsent = 0;
      unsent = [];
      resetOwn();
    },

    /** Takes over a snapshot. me is the guest's own character. Returns the events in it. */
    onSnap(msg, me) {
      if (!Array.isArray(msg.a) || mirror.state === 'menu') return [];
      if (msg.s === 'countdown' || msg.s === 'playing' || msg.s === 'ended') mirror.state = msg.s;
      mirror.timeLeft = num(msg.tl);
      mirror.countdown = num(msg.cd);
      if (Number.isFinite(msg.ht)) hostTime = msg.ht;
      age = 0;
      sim.actors.forEach((a, i) => {
        const list = msg.a[i];
        if (!Array.isArray(list)) return;
        const wasAlive = a.alive;
        if (a === me) {
          unpackActor(a, list, true);
          if (!a.alive || !wasAlive || !synced || mirror.state !== 'playing') {
            // out, before the start or just back in: stand where the host says
            takeOver(a, list);
            if (!a.alive || mirror.state !== 'playing') synced = false;
          } else if (Number.isInteger(msg.k)) {
            correct(a, list, msg.k);
          }
          return;
        }
        unpackActor(a, list, false);
        targets[i].set(num(list[0]), num(list[1]), num(list[2]));
        if (!wasAlive || a.pos.distanceTo(targets[i]) > TELEPORT) a.pos.copy(targets[i]);
      });
      if (Array.isArray(msg.ops)) for (const op of msg.ops) if (Array.isArray(op)) paint.apply(op);
      if (Array.isArray(msg.shots)) {
        for (const s of msg.shots) {
          // the own drops already fly here (they left when the key was pressed)
          if (!Array.isArray(s) || (me && s[7] === me.id)) continue;
          sim.addProjectile(s[0], s[1], s[2], s[3], s[4], s[5], s[6] === 2 ? 2 : 1, null);
        }
      }
      return Array.isArray(msg.ev) ? msg.ev.filter(Array.isArray) : [];
    },

    /**
     * The moment on the host's clock that this screen shows of the other
     * character (ms): the newest snapshot, moved on a little (MAX_AHEAD) and
     * a little behind because of the smoothing (CATCH_UP). -1 = not known.
     */
    seenMs() {
      if (hostTime < 0) return -1;
      return Math.max(0, Math.round(hostTime + (Math.min(age, MAX_AHEAD) - 1 / CATCH_UP) * 1000));
    },

    /**
     * Every frame: move the own character step by step with its keys (me.input),
     * glide the others towards their reported positions, fly the water.
     */
    update(dt, me) {
      if (mirror.state !== 'countdown' && mirror.state !== 'playing') return;
      age += dt;
      paint.now += dt; // the clock of the early own paint (paint.js)
      if (me && mirror.state === 'countdown') me.yaw = me.input.aimYaw; // look around
      if (me && mirror.state === 'playing') {
        acc += dt;
        while (acc >= STEP) {
          acc -= STEP;
          const list = packInput(me.input, mirror.seenMs());
          unpackInput(me.input, list); // the same rounded values the host gets
          if (me.alive && synced) sim.updateActor(me, STEP);
          if (unsent.length === 0) firstUnsent = seq;
          unsent.push(list);
          steps.set(seq, { x: me.pos.x, y: me.pos.y, z: me.pos.z });
          steps.delete(seq - KEEP_STEPS);
          seq++;
        }
        softFix(me, 1 - Math.exp(-dt * FIX_RATE));
      }
      const ahead = Math.min(age, MAX_AHEAD);
      const k = 1 - Math.exp(-dt * CATCH_UP);
      sim.actors.forEach((a, i) => {
        if (a === me) return;
        const t = targets[i];
        a.pos.x += (t.x + a.vel.x * ahead - a.pos.x) * k;
        a.pos.y += (t.y - a.pos.y) * k;
        a.pos.z += (t.z + a.vel.z * ahead - a.pos.z) * k;
      });
      sim.updateProjectiles(dt);
    },

    /** The keys of the steps since the last call, as a message for the host (or null). */
    takeInputs() {
      if (unsent.length === 0) return null;
      return { t: 'input', n: firstUnsent, s: unsent.splice(0) };
    },

    toMenu() {
      mirror.state = 'menu';
      sim.projectiles = [];
      resetOwn();
    },
  };
  return mirror;
}
