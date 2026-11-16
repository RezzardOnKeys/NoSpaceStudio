// Dust Dash – the guest's copy of a party match. The guest's browser decides
// nothing that counts. It repeats what the referee (host.js) reports: where
// the other player is, which pieces of dirt are gone, the scores, the
// delivery box and the power-ups. It has the same shape as the referee, so
// game.js can use either.
//
// The guest's own character is moved here at once, with the same rules as
// on the host (Sim.updatePlayer), so the keys react without delay. Every
// step of the rules gets a number and its keys go to the host (takeInputs,
// feed.js). The host reports which step it played last (k) and where the
// character was after it. If that differs from where it was here after the
// same step, the difference is made up softly over a few frames.
//
// Dirt in front of the guest's own nozzle flies into it at once ("early"),
// for the feeling. It only counts when the host confirms it. A piece the
// host does not confirm within a second (the other player was faster) is
// put back on the floor.

import { CONFIG, STEP } from './config.js';
import { unpackPlayer, packInput, unpackInput, unpackDelivery, unpackIds } from './wire.js';

// A snapshot arrives about 30 times per second. Between two of them the
// other player keeps moving with its last speed, at most this long (seconds).
const MAX_AHEAD = 0.1;
// How quickly the shown position of the other player closes in on the reported one.
const CATCH_UP = 22;
// Own character: how quickly a difference to the host is made up (per
// second; 8 means most of it is gone after a quarter of a second).
const FIX_RATE = 8;
// A difference larger than this (metres) is taken over at once.
const FIX_SNAP = 2;
// Steps of the own character that are remembered for the comparison (2 s).
const KEEP_STEPS = 120;
// An early piece the host has not confirmed after this long comes back (seconds).
const EARLY_WAIT = 1;

const num = (v) => (Number.isFinite(v) ? v : 0);

/** mySeat: the seat of this browser's player. */
export function createMirror({ sim, mySeat }) {
  let targets = []; // where the host says each player is
  let age = 0; // seconds since the newest snapshot
  // own character
  let stepTime = 0;
  let seq = 0;
  let firstUnsent = 0;
  let unsent = [];
  let steps = new Map(); // step number -> where the own character was after it
  let synced = false; // false until the own character stands where the host says
  const fix = { x: 0, z: 0 };

  function resetOwn() {
    stepTime = 0;
    steps = new Map();
    synced = false;
    fix.x = fix.z = 0;
  }

  /** Compares the host's place after step k with the own one and starts the correction. */
  function correct(me, list, k) {
    const mine = steps.get(k);
    for (const key of steps.keys()) {
      if (key > k) break;
      steps.delete(key);
    }
    if (!mine) return;
    const ex = num(list[0]) - mine.x;
    const ez = num(list[1]) - mine.z;
    // the steps after k were worked out from the old place: move them too
    for (const p of steps.values()) {
      p.x += ex;
      p.z += ez;
    }
    if (Math.hypot(ex, ez) > FIX_SNAP) {
      me.x = me.px = num(list[0]);
      me.z = me.pz = num(list[1]);
      me.vx = num(list[2]);
      me.vz = num(list[3]);
      steps = new Map();
      fix.x = fix.z = 0;
    } else {
      fix.x += ex;
      fix.z += ez;
    }
  }

  const mirror = {
    state: 'menu', // menu | countdown | playing | ended
    timeLeft: 0,
    countdown: 0,
    seed: 1,
    get scores() {
      return sim.players.map((p) => p.score);
    },
    /** How far the picture is between the last two steps of the own character (0..1). */
    get between() {
      return mirror.state === 'playing' ? stepTime / STEP : 1;
    },

    /** Sets up the same players and the same dirt as the referee's start(). */
    start(playerCount, seed) {
      mirror.seed = seed;
      sim.authority = false;
      sim.reset(seed);
      for (let seat = 0; seat < playerCount; seat++) sim.addPlayer(seat);
      targets = sim.players.map((p) => ({ x: p.x, z: p.z }));
      mirror.timeLeft = CONFIG.match.duration;
      mirror.countdown = CONFIG.match.countdown;
      mirror.state = 'countdown';
      age = 0;
      seq = 0;
      firstUnsent = 0;
      unsent = [];
      resetOwn();
    },

    /**
     * The pieces that were already gone when this guest joined (message
     * 'dirt'). Returns their numbers, so the picture can hide them.
     */
    onDirt(packed) {
      const ids = unpackIds(packed, sim.dirt.count);
      for (const id of ids) sim.dirt.remove(id);
      return ids;
    },

    /** Takes over a snapshot of the referee (message 'snap'). */
    onSnap(msg) {
      if (!Array.isArray(msg.p) || mirror.state === 'menu') return;
      if (msg.s === 'countdown' || msg.s === 'playing' || msg.s === 'ended') mirror.state = msg.s;
      mirror.timeLeft = num(msg.tl);
      mirror.countdown = num(msg.cd);
      age = 0;

      sim.players.forEach((p, i) => {
        const list = msg.p[i];
        if (!Array.isArray(list)) return;
        const own = i === mySeat;
        unpackPlayer(p, list, own);
        if (!own) {
          targets[i].x = num(list[0]);
          targets[i].z = num(list[1]);
          if (Math.hypot(p.x - targets[i].x, p.z - targets[i].z) > 5) {
            p.x = targets[i].x;
            p.z = targets[i].z;
          }
        } else if (!synced) {
          // before the start or just (back) in: stand where the host says
          p.x = p.px = num(list[0]);
          p.z = p.pz = num(list[1]);
          p.vx = num(list[2]);
          p.vz = num(list[3]);
          steps = new Map();
          fix.x = fix.z = 0;
          synced = mirror.state === 'playing';
        } else if (Number.isInteger(msg.k)) {
          correct(p, list, msg.k);
        }
      });

      unpackDelivery(sim.delivery, msg.d);

      // Pieces the host gave to a player since the last snapshot.
      if (Array.isArray(msg.rm)) {
        msg.rm.forEach((packed, seat) => {
          for (const id of unpackIds(packed, sim.dirt.count)) {
            sim.early.delete(id); // confirmed (or taken by the other player)
            // Still lying here: now it flies. (An early piece already flew.)
            if (sim.dirt.remove(id)) sim.events.push({ type: 'suck', id, seat });
          }
        });
      }
      // Boxes that were opened: [seat, power, x, z]
      if (Array.isArray(msg.ev)) {
        for (const e of msg.ev) {
          if (!Array.isArray(e)) continue;
          sim.events.push({ type: 'open', seat: num(e[0]), power: num(e[1]), x: num(e[2]), z: num(e[3]) });
        }
      }
    },

    /**
     * Every frame: move the own character step by step with its keys, glide
     * the other player towards the reported place, let the clocks run on.
     */
    step(dt) {
      if (mirror.state !== 'countdown' && mirror.state !== 'playing') return;
      const me = sim.players[mySeat];
      age += dt;
      sim.time += dt;

      if (mirror.state === 'countdown') {
        mirror.countdown = Math.max(0, mirror.countdown - dt);
        me.yaw = me.input.yaw; // look around
      } else {
        mirror.timeLeft = Math.max(0, mirror.timeLeft - dt);
        stepTime += dt;
        while (stepTime >= STEP) {
          stepTime -= STEP;
          const list = packInput(me.input);
          unpackInput(me.input, list); // the same rounded values the host gets
          if (synced) sim.updatePlayer(me, STEP);
          if (unsent.length === 0) firstUnsent = seq;
          unsent.push(list);
          steps.set(seq, { x: me.x, z: me.z });
          steps.delete(seq - KEEP_STEPS);
          seq++;
        }
        // Make up a part of the difference to the host, never into a wall.
        const k = 1 - Math.exp(-dt * FIX_RATE);
        me.x += fix.x * k;
        me.z += fix.z * k;
        fix.x -= fix.x * k;
        fix.z -= fix.z * k;
        sim.hall.collide(me, CONFIG.move.radius);
      }

      // The other players glide to where the host says they are.
      const ahead = Math.min(age, MAX_AHEAD);
      const glide = 1 - Math.exp(-dt * CATCH_UP);
      sim.players.forEach((p, i) => {
        if (i === mySeat) return;
        p.x += (targets[i].x + p.vx * ahead - p.x) * glide;
        p.z += (targets[i].z + p.vz * ahead - p.z) * glide;
        p.px = p.x;
        p.pz = p.z;
      });

      // Clocks run on between two snapshots, so bars and the box move evenly.
      for (const p of sim.players) if (p.power >= 0) p.powerT = Math.max(0, p.powerT - dt);
      const d = sim.delivery;
      if (d.state === 'timer') d.t = Math.max(0, d.t - dt);
      else if (d.state === 'falling') d.fall = Math.min(1, d.fall + dt / CONFIG.delivery.fallTime);

      // Early pieces the host never confirmed lie on the floor again.
      for (const [id, since] of sim.early) {
        if (sim.time - since < EARLY_WAIT) break; // the map keeps them in order of time
        sim.early.delete(id);
        sim.dirt.restore(id);
        sim.events.push({ type: 'back', id });
      }
    },

    /** The keys of the steps since the last call, as a message for the host (or null). */
    takeInputs() {
      if (unsent.length === 0) return null;
      return { t: 'input', n: firstUnsent, s: unsent.splice(0) };
    },

    toMenu() {
      mirror.state = 'menu';
      resetOwn();
    },
  };
  return mirror;
}
