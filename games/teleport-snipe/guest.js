// Teleport Snipe – the guest's copy of a party match. The host's referee
// (host.js) decides everything; this copy takes over what the host reports
// about 30 times per second (state, countdown, round, score, the hit that
// ended a round, where everybody is, shots and teleports). It has the same
// shape as the referee, so game.js can use either.
//
// The guest's own player is moved here at once, with the same rules as on
// the host (sim.js), so the keys react without delay. Every step of the
// rules gets a number and its keys go to the host (takeInputs, feed.js).
// The host reports which step it played last (a) and where the player was
// after it. If that differs from where it was here after the same step,
// the difference is made up softly over a few frames; a big difference
// (for example after a teleport the guest did not expect) is taken over
// at once.
//
// A shot of the guest is worked out here at once for the feeling (tracer,
// hit marker, the teleport to the spot from the match's seed), and sent to
// the host with the step it was fired after and the host step the guest
// saw the host's player at. The host's answer decides.
//
// The host's player is shown a little in the past (RENDER_DELAY), gliding
// between the two reports around that moment, so it moves smoothly.

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import {
  createPlayer,
  placePlayer,
  movePlayer,
  createDummies,
  tickDummies,
  resolveShot,
  blocked,
  bodyHeight,
} from './sim.js';
import { packInput, unpackInput, unpackPlayer, unpackPoint } from './wire.js';

const STATES = ['countdown', 'playing', 'slowmo', 'card', 'ended'];
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const validSeat = (v) => Number.isInteger(v) && v >= 0 && v < MAX_PLAYERS;

// The other player is shown this many host steps in the past (a report
// arrives every 2 steps, so there are nearly always two to glide between).
const RENDER_DELAY = 4;
// Own player: how quickly a difference to the host is made up (per second;
// 10 means most of it is gone after a fifth of a second).
const FIX_RATE = 10;
// A difference larger than this (metres) is taken over at once ...
const FIX_SNAP = 1.5;
// ... and one smaller than this is only rounding (positions travel in mm).
const FIX_IGNORE = 0.01;
// Steps of the own player that are remembered for the comparison (2 s).
const KEEP_STEPS = 120;

/** mySeat: the guest's own seat; only that player is moved here. */
export function createMirror({ mySeat }) {
  const otherSeat = 1 - mySeat;
  let stepTime = 0;
  let seq = 0; // number of the next own step
  let firstUnsent = 0;
  let unsent = [];
  let steps = new Map(); // step number -> where the own player was after it
  let synced = false; // false until the own player stands where the host says
  let reports = []; // the other player: { hn, x, y, z, yaw, crouching }
  let viewStep = 0; // the host step the other player is shown at
  let predicted = new Set(); // own shot numbers that were teleported here already
  const fix = { x: 0, y: 0, z: 0 };

  function resetOwn() {
    stepTime = 0;
    steps = new Map();
    synced = false;
    unsent = [];
    fix.x = fix.y = fix.z = 0;
  }

  /** Compares the host's place after step a with the own one and starts the correction. */
  function correct(me, host, a) {
    const mine = steps.get(a);
    for (const key of steps.keys()) {
      if (key > a) break;
      steps.delete(key);
    }
    if (!mine) return;
    const ex = host.x - mine.x;
    const ey = host.y - mine.y;
    const ez = host.z - mine.z;
    if (Math.hypot(ex, ey, ez) < FIX_IGNORE) return;
    // The steps after a were worked out from the old place: move them too.
    for (const p of steps.values()) {
      p.x += ex;
      p.y += ey;
      p.z += ez;
    }
    if (Math.hypot(ex, ey, ez) > FIX_SNAP) {
      // Far off (a teleport, a missed step): stand where the host says.
      me.x = me.px = host.x + (me.x - mine.x);
      me.y = me.py = host.y + (me.y - mine.y);
      me.z = me.pz = host.z + (me.z - mine.z);
      if (blocked(me.x, me.y, me.z, bodyHeight(me))) {
        me.x = me.px = host.x;
        me.y = me.py = host.y;
        me.z = me.pz = host.z;
      }
      me.vx = host.vx;
      me.vy = host.vy;
      me.vz = host.vz;
      steps = new Map();
      fix.x = fix.y = fix.z = 0;
    } else {
      fix.x += ex;
      fix.y += ey;
      fix.z += ez;
    }
  }

  const mirror = {
    state: 'menu', // menu | countdown | playing | slowmo | card | ended
    round: 1,
    countdown: 0,
    scores: [0, 0],
    seed: 1,
    kill: null, // { victim, shooter } of the hit that ended the round
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    dummies: createDummies(), // straw targets until the bot exists (map.js)
    // Like the referee's: { type: 'teleport', seat, n, from, to } and
    // { type: 'shot', seat, from, to, hit } (shots of the other player).
    events: [],
    get between() {
      return mirror.state === 'playing' || mirror.state === 'slowmo' ? stepTime / STEP : 1;
    },
    get speed() {
      return mirror.state === 'slowmo' ? CONFIG.match.slowmoSpeed : 1;
    },

    /** A match begins (the host's "start" message). */
    start(seed) {
      mirror.seed = seed;
      mirror.round = 1;
      mirror.scores = new Array(MAX_PLAYERS).fill(0);
      mirror.dummies = createDummies();
      for (const p of mirror.players) p.shots = 0;
      predicted = new Set();
      reports = [];
      mirror.beginRound();
    },

    /** Everybody back to their start points. */
    beginRound() {
      for (const p of mirror.players) placePlayer(p, startOf(p.seat, mirror.round));
      mirror.countdown = CONFIG.match.countdown;
      mirror.kill = null;
      resetOwn();
      mirror.state = 'countdown';
    },

    step(dt) {
      const me = mirror.players[mySeat];
      viewStep += dt * mirror.speed * 60;
      if (mirror.state === 'countdown') {
        me.yaw = me.input.yaw;
        mirror.countdown = Math.max(0, mirror.countdown - dt);
      } else if (mirror.state === 'playing' || mirror.state === 'slowmo') {
        stepTime += dt * mirror.speed;
        while (stepTime >= STEP) {
          stepTime -= STEP;
          const list = packInput(me.input);
          unpackInput(me.input, list); // the same rounded values the host gets
          if (synced && me.alive) movePlayer(me, STEP);
          if (unsent.length === 0) firstUnsent = seq;
          unsent.push(list);
          steps.set(seq, { x: me.x, y: me.y, z: me.z });
          steps.delete(seq - KEEP_STEPS);
          seq++;
          tickDummies(mirror.dummies, STEP);
        }
        // Make up a part of the difference to the host, never into a wall.
        const k = 1 - Math.exp(-dt * FIX_RATE);
        const nx = me.x + fix.x * k;
        const ny = me.y + fix.y * k;
        const nz = me.z + fix.z * k;
        if (!blocked(nx, ny, nz, bodyHeight(me))) {
          me.x = nx;
          me.y = Math.max(0, ny); // never below the ground
          me.z = nz;
        }
        fix.x -= fix.x * k;
        fix.y -= fix.y * k;
        fix.z -= fix.z * k;
      }
      mirror.showOther();
    },

    /** Puts the other player where it is shown: between two reports, a little in the past. */
    showOther() {
      const o = mirror.players[otherSeat];
      if (reports.length === 0) return;
      const newest = reports[reports.length - 1];
      // Never too far behind or ahead of the reports.
      viewStep = Math.min(newest.hn, Math.max(newest.hn - RENDER_DELAY * 3, viewStep));
      let a = reports[0];
      let b = reports[0];
      for (const r of reports) {
        if (r.hn <= viewStep) a = r;
        if (r.hn >= viewStep) {
          b = r;
          break;
        }
      }
      const t = b.hn > a.hn ? (viewStep - a.hn) / (b.hn - a.hn) : 0;
      // A teleport is a jump, not a glide.
      const jump = Math.hypot(b.x - a.x, b.z - a.z) > 3;
      const w = jump ? (t < 1 ? 0 : 1) : t;
      o.x = o.px = a.x + (b.x - a.x) * w;
      o.y = o.py = a.y + (b.y - a.y) * w;
      o.z = o.pz = a.z + (b.z - a.z) * w;
      o.yaw = (w < 0.5 ? a : b).yaw;
      o.crouching = (w < 0.5 ? a : b).crouching;
    },

    toMenu() {
      mirror.state = 'menu';
      resetOwn();
    },

    /**
     * The guest shoots: worked out here at once (a miss teleports the guest
     * at once), then sent to the host, whose answer decides. Returns the
     * local answer (see resolveShot) and a message for the host.
     */
    shoot(seat, shot) {
      if (mirror.state !== 'playing' || !synced) return null;
      const out = resolveShot(mirror.seed, mirror.players[seat], shot, mirror.players, mirror.dummies);
      if (!out) return null;
      const n = mirror.players[seat].shots;
      if (out.to) {
        predicted.add(n);
        mirror.events.push({ type: 'teleport', seat, n, from: out.from, to: out.to });
        // The place after the teleport is the place "after the last step".
        steps.set(seq - 1, { x: mirror.players[seat].x, y: mirror.players[seat].y, z: mirror.players[seat].z });
      }
      out.message = { t: 'shot', r: mirror.round, n: seq - 1, v: viewStep, ...shot };
      return out;
    },

    /** The keys of the steps since the last call, as a message for the host (or null). */
    takeInputs() {
      if (unsent.length === 0) return null;
      return { t: 'input', r: mirror.round, n: firstUnsent, s: unsent.splice(0) };
    },

    /** Takes over a report from the host. Every value is checked: it comes from another computer. */
    onSnap(msg) {
      if (STATES.includes(msg.s)) mirror.state = msg.s;
      mirror.countdown = Math.min(CONFIG.match.countdown, Math.max(0, num(msg.cd)));
      const round = Math.max(1, Math.round(num(msg.r, 1)));
      if (round !== mirror.round) {
        // A new round (or a guest who reloaded joins a later one): back to the start points.
        mirror.round = round;
        for (const p of mirror.players) placePlayer(p, startOf(p.seat, round));
        resetOwn();
        reports = [];
      }
      if (Array.isArray(msg.sc)) {
        mirror.scores = mirror.scores.map((_, i) =>
          Math.min(CONFIG.match.roundsToWin, Math.max(0, Math.round(num(msg.sc[i])))),
        );
      }
      const k = Array.isArray(msg.k) && validSeat(msg.k[0]) && validSeat(msg.k[1]) ? msg.k : null;
      mirror.kill = k ? { victim: k[0], shooter: k[1] } : null;
      for (const p of mirror.players) p.alive = !k || k[0] !== p.seat;

      const hn = num(msg.hn, -1);
      const list = Array.isArray(msg.p) ? msg.p : [];
      const other = unpackPlayer(list[otherSeat]);
      if (other && hn >= 0) {
        if (reports.length && hn < reports[reports.length - 1].hn) reports = []; // a new match on the host
        reports.push({ hn, ...other });
        if (reports.length > 12) reports.shift();
        if (reports.length === 1) viewStep = hn - RENDER_DELAY;
        mirror.players[otherSeat].reload = other.reload;
      }
      const host = unpackPlayer(list[mySeat]);
      const me = mirror.players[mySeat];
      if (host) {
        if (!synced) {
          // Before the round runs or just (back) in: stand where the host says.
          Object.assign(me, { x: host.x, y: host.y, z: host.z, vx: host.vx, vy: host.vy, vz: host.vz });
          me.px = me.x;
          me.py = me.y;
          me.pz = me.z;
          me.shots = host.shots;
          steps = new Map();
          fix.x = fix.y = fix.z = 0;
          synced = mirror.state === 'playing';
        } else if (Number.isInteger(msg.a) && msg.a >= 0) {
          correct(me, host, msg.a);
          // The host counts the shots; this keeps the teleport spots the same.
          if (host.shots > me.shots) me.shots = host.shots;
        }
      }

      for (const e of Array.isArray(msg.ev) ? msg.ev : []) mirror.takeEvent(e);
    },

    /** A shot or a teleport the host reports (see snapshot() in host.js). */
    takeEvent(e) {
      if (!Array.isArray(e) || !validSeat(e[1])) return;
      const seat = e[1];
      if (e[0] === 's' && seat !== mySeat) {
        const from = unpackPoint(e[2]);
        const to = unpackPoint(e[3]);
        if (from && to) mirror.events.push({ type: 'shot', seat, from, to, hit: false });
      } else if (e[0] === 't') {
        const n = num(e[2]);
        // An own teleport that was already shown here needs no second flash.
        if (seat === mySeat && predicted.has(n)) return;
        const from = unpackPoint(e[3]);
        const to = unpackPoint(e[4]);
        if (from && to) mirror.events.push({ type: 'teleport', seat, n, from, to });
      }
    },
  };
  return mirror;
}
