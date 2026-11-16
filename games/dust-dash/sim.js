// Dust Dash – the rules: the players, how they walk, how the vacuum takes
// dirt, the delivery boxes and the power-ups. The rules run in fixed steps
// of STEP seconds, so the same keys give the same way on every computer.
//
// Directions: yaw 0 looks along -z, a positive yaw turns to the left.

import { CONFIG, POWER, POWERS } from './config.js';

export class Sim {
  constructor(hall, dirt, nav) {
    this.hall = hall;
    this.dirt = dirt;
    this.nav = nav;
    this.players = []; // in the order of the seats
    // What happened in the last steps, for the picture (game.js empties it):
    // { type: 'suck', id, seat }  the player of this seat got piece id
    // { type: 'open', seat, power, x, z }  that player opened the box at (x, z)
    // { type: 'back', id }        a piece the guest took too early lies there again
    this.events = [];
    // true where the match is decided (alone, or the party host). On a
    // party guest it is false: its own nozzle takes pieces only "early",
    // for the picture, and the host says what really counts (guest.js).
    this.authority = true;
    this.early = new Map(); // guest: piece number -> when it was taken early
    this.time = 0; // guest: a clock for the early pieces
    this.delivery = null;
    this.resetDelivery();
  }

  /**
   * The delivery box. state: 'timer' (t seconds until the next box),
   * 'falling' (fall goes from 0 at the roof to 1 on the floor) or 'waiting'
   * (it lies at x, z until somebody touches it).
   */
  resetDelivery() {
    this.delivery = { state: 'timer', t: CONFIG.delivery.first, x: 0, z: 0, fall: 0 };
  }

  /** A fresh match: no players yet, the dirt laid out from the seed. */
  reset(seed) {
    this.players = [];
    this.events = [];
    this.early.clear();
    this.time = 0;
    this.dirt.build(seed);
    this.resetDelivery();
  }

  /** Puts a new player on the start point of a seat and returns it. */
  addPlayer(seat) {
    const s = this.hall.start(seat);
    const p = {
      seat,
      x: s.x,
      z: s.z,
      // where the player was one step ago (the picture glides between the two)
      px: s.x,
      pz: s.z,
      vx: 0,
      vz: 0,
      yaw: s.yaw,
      vacuuming: false,
      score: 0,
      power: -1, // the active power-up (see POWER in config.js), -1: none
      powerT: 0, // seconds it still lasts
      // true: the referee's loop does not move this player; its steps come
      // from the guest's keys (feed.js)
      external: false,
      // What the player wants: f forward (1) or back (-1), s right (1) or
      // left (-1), yaw the view direction, vac holding the vacuum button.
      input: { f: 0, s: 0, yaw: s.yaw, vac: false },
    };
    this.players.push(p);
    return p;
  }

  /** One step for one player: walk, then vacuum. */
  updatePlayer(p, dt) {
    this.walk(p, dt);
    if (p.vacuuming) this.vacuum(p);
  }

  walk(p, dt) {
    const M = CONFIG.move;
    const inp = p.input;
    p.yaw = inp.yaw;
    p.vacuuming = inp.vac;

    // The direction the keys ask for, in the hall's directions.
    let wx = -Math.sin(p.yaw) * inp.f + Math.cos(p.yaw) * inp.s;
    let wz = -Math.cos(p.yaw) * inp.f - Math.sin(p.yaw) * inp.s;
    const len = Math.hypot(wx, wz);
    if (len > 1) {
      wx /= len; // walking diagonally is not faster
      wz /= len;
    }
    let max = p.vacuuming ? M.vacuumSpeed : M.walkSpeed;
    if (p.power === POWER.TURBO) max *= CONFIG.power.turboSpeed;

    // The speed follows the keys quickly, but not in a single step.
    const dvx = wx * max - p.vx;
    const dvz = wz * max - p.vz;
    const dv = Math.hypot(dvx, dvz);
    const rate = (len > 0 ? M.accel : M.decel) * dt;
    if (dv <= rate) {
      p.vx = wx * max;
      p.vz = wz * max;
    } else {
      p.vx += (dvx / dv) * rate;
      p.vz += (dvz / dv) * rate;
    }

    p.px = p.x;
    p.pz = p.z;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    this.hall.collide(p, M.radius);
    // What a wall took away from the step is gone from the speed too.
    p.vx = (p.x - p.px) / dt;
    p.vz = (p.z - p.pz) / dt;
  }

  /** How long and how wide a player's nozzle area is right now. */
  nozzle(p) {
    const V = CONFIG.vacuum;
    const P = CONFIG.power;
    if (p.power === POWER.WIDE) return { reach: V.reach, width: V.width * P.wideWidth };
    if (p.power === POWER.STRONG) return { reach: P.strongReach, width: V.width * P.strongWidth };
    return { reach: V.reach, width: V.width };
  }

  /**
   * The nozzle's area: a strip on the floor in front of the player, `reach`
   * long and `width` wide. Every piece in it belongs to this player at once
   * (1 point each, 2 with the golden nozzle); the picture then lets it fly
   * into the nozzle.
   */
  vacuum(p) {
    const V = this.nozzle(p);
    const points = p.power === POWER.GOLD ? CONFIG.power.goldPoints : 1;
    const half = V.width / 2;
    const fx = -Math.sin(p.yaw); // forward
    const fz = -Math.cos(p.yaw);
    const rx = -fz; // to the right
    const rz = fx;
    const span = V.reach + half;
    this.dirt.forEachIn(p.x - span, p.x + span, p.z - span, p.z + span, (id) => {
      const dx = this.dirt.x[id] - p.x;
      const dz = this.dirt.z[id] - p.z;
      const ahead = dx * fx + dz * fz;
      const aside = dx * rx + dz * rz;
      if (ahead < -0.15 || ahead > V.reach || Math.abs(aside) > half) return;
      if (this.hall.blocksSuction(p.x, p.z, this.dirt.x[id], this.dirt.z[id])) return;
      this.dirt.remove(id);
      if (this.authority) p.score += points;
      else this.early.set(id, this.time);
      this.events.push({ type: 'suck', id, seat: p.seat });
    });
  }

  /** One step for everything that is not a player: power-up clocks and the delivery. */
  updateWorld(dt) {
    const D = CONFIG.delivery;
    for (const p of this.players) {
      if (p.power < 0) continue;
      p.powerT -= dt;
      if (p.powerT <= 0) {
        p.power = -1;
        p.powerT = 0;
      }
    }

    const d = this.delivery;
    if (d.state === 'timer') {
      d.t -= dt;
      if (d.t <= 0) {
        const spot = this.fairSpot();
        d.x = spot.x;
        d.z = spot.z;
        d.fall = 0;
        d.state = 'falling';
      }
    } else if (d.state === 'falling') {
      d.fall += dt / D.fallTime;
      if (d.fall >= 1) {
        d.fall = 1;
        d.state = 'waiting';
      }
    } else {
      // Whoever touches the box first opens it; if two touch it in the same
      // step, the one who is closer gets it.
      let first = null;
      let best = D.touch;
      for (const p of this.players) {
        const far = Math.hypot(p.x - d.x, p.z - d.z);
        if (far < best) {
          best = far;
          first = p;
        }
      }
      if (first) {
        // A new power-up replaces a running one and lasts the full time.
        first.power = Math.floor(Math.random() * POWERS.length);
        first.powerT = CONFIG.power.time;
        this.events.push({ type: 'open', seat: first.seat, power: first.power, x: d.x, z: d.z });
        d.state = 'timer';
        d.t = D.every;
      }
    }
  }

  /**
   * A place for the next box: free floor with room around it, not close to
   * anybody, and about the same way to walk for every player. If no place
   * is that fair, the allowed difference grows until one is found.
   */
  fairSpot() {
    const D = CONFIG.delivery;
    const nav = this.nav;
    const fields = this.players.map((p) => nav.distances(p.x, p.z));
    const spots = []; // [square, difference between the longest and the shortest way]
    let fairest = Infinity;
    for (let c = 0; c < nav.roomy.length; c++) {
      if (!nav.roomy[c]) continue;
      let near = Infinity;
      let far = 0;
      for (const f of fields) {
        near = Math.min(near, f[c]);
        far = Math.max(far, f[c]);
      }
      if (far === Infinity || near < D.minDistance) continue;
      spots.push([c, far - near]);
      fairest = Math.min(fairest, far - near);
    }
    if (!spots.length) return { x: 0, z: 3 }; // cannot happen in this hall; next to the middle bench
    const allowed = Math.max(D.fairness, fairest);
    const fair = spots.filter((s) => s[1] <= allowed);
    const pick = fair[Math.floor(Math.random() * fair.length)][0];
    return { x: nav.cellX(pick), z: nav.cellZ(pick) };
  }
}
