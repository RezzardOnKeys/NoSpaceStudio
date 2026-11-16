// Dust Dash – the bot you play against when you start the game alone. It
// plays fair: it presses the same "keys" as a player (walk, turn, vacuum),
// walks at the same speeds and knows nothing a player cannot see. How good
// it is comes from the numbers under `bot` in config.js.
//
// What it does, in this order:
//   1. A delivery dropped and its way there is not clearly longer than the
//      player's: run to the box (without vacuuming while it is far).
//   2. Dirt close by: walk to the nearest piece it can see and vacuum.
//   3. Nothing close: pick the dirtiest area that is not too far (it knows
//      how much dirt is left in every square of 2 x 2 m) and walk there
//      around the obstacles (nav.js).

import { CONFIG } from './config.js';

const LOOK_EVERY = 0.12; // seconds between two looks for the nearest piece

export class Bot {
  constructor(player, sim, nav) {
    this.p = player;
    this.sim = sim;
    this.nav = nav;
    this.yaw = player.yaw;
    this.field = null; // walking distances to the place it is heading for
    this.goal = 'none'; // none | area | box
    this.lookT = 0;
    this.piece = -1; // the piece of dirt it is walking to
    this.rest = 0;
    this.worked = 0; // seconds of vacuuming since the last breather
    this.pause = 0; // seconds of the breather that are left
    this.stuck = 0;
    this.blind = 0; // seconds it ignores single pieces (after getting stuck)
    this.boxSeen = 0; // seconds since the current delivery appeared
    this.wantsBox = false;
    this.lastX = player.x;
    this.lastZ = player.z;
  }

  /** One step of the rules: decide and "press the keys". */
  think(dt) {
    const B = CONFIG.bot;
    const { p, sim, nav } = this;
    const inp = p.input;
    const d = sim.delivery;

    // Has it moved? Standing still although it wants to walk means stuck.
    const moved = Math.hypot(p.x - this.lastX, p.z - this.lastZ);
    this.lastX = p.x;
    this.lastZ = p.z;
    this.stuck = inp.f && moved < 0.01 ? this.stuck + dt : 0;
    this.blind = Math.max(0, this.blind - dt);
    if (this.stuck > 0.6) {
      this.stuck = 0;
      this.blind = 1.5;
      this.piece = -1;
      this.pickArea(true);
    }

    // ---- 1. The delivery ------------------------------------------------
    if (d.state === 'timer') {
      this.boxSeen = 0;
      if (this.goal === 'box') this.goal = 'none';
    } else {
      const before = this.boxSeen;
      this.boxSeen += dt;
      // It notices the box after its reaction time, and thinks again every
      // few seconds while the box lies there (the player may have walked off).
      const again = Math.floor((this.boxSeen - B.reaction) / B.boxAgain);
      const noticed = before < B.reaction && this.boxSeen >= B.reaction;
      const rethink = this.goal !== 'box' && again > Math.floor((before - B.reaction) / B.boxAgain);
      if (noticed || (this.boxSeen > B.reaction && rethink)) {
        // Is it worth running?
        const field = nav.distances(d.x, d.z);
        const mine = field[nav.cellAt(p.x, p.z)];
        let others = Infinity;
        for (const o of sim.players) {
          if (o !== p) others = Math.min(others, field[nav.cellAt(o.x, o.z)]);
        }
        this.wantsBox = mine <= others * B.boxBias;
        if (this.wantsBox) {
          this.field = field;
          this.goal = 'box';
        }
      }
    }
    if (this.goal === 'box') {
      const next = nav.toward(this.field, p.x, p.z, 3);
      const close = Math.hypot(d.x - p.x, d.z - p.z) < 1.5;
      this.walkTo(close ? d.x : next.x, close ? d.z : next.z, dt, next.left <= B.sprintFrom);
      return;
    }

    // ---- A breather now and then, so a player can keep up ------------------
    if (this.pause > 0) {
      this.pause -= dt;
      inp.f = inp.s = 0;
      inp.vac = false;
      return;
    }
    if (inp.vac) this.worked += dt;
    if (this.worked >= B.workFor) {
      this.worked = 0;
      this.pause = B.breather;
    }

    // ---- 2. Dirt close by -------------------------------------------------
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = LOOK_EVERY;
      this.piece = this.blind > 0 ? -1 : this.nearestPiece();
    }
    if (this.piece >= 0 && sim.dirt.there[this.piece]) {
      this.goal = 'none';
      this.rest = B.rest;
      this.walkTo(sim.dirt.x[this.piece], sim.dirt.z[this.piece], dt, true);
      return;
    }

    // ---- 3. Walk to a dirty area -------------------------------------------
    if (this.goal !== 'area') {
      // A short breather, like a player looking around.
      this.rest -= dt;
      inp.f = inp.s = 0;
      inp.vac = false;
      if (this.rest > 0) return;
      this.pickArea(false);
    }
    const next = nav.toward(this.field, p.x, p.z, 3);
    if (next.left < 1) this.goal = 'none'; // arrived and nothing to see: pick again
    this.walkTo(next.x, next.z, dt, false);
  }

  /** Turns towards (x, z) and walks; vac: hold the vacuum button. */
  walkTo(x, z, dt, vac) {
    const p = this.p;
    const want = Math.atan2(-(x - p.x), -(z - p.z));
    let turn = (want - this.yaw) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    const max = CONFIG.bot.turnRate * dt;
    this.yaw += Math.max(-max, Math.min(max, turn));
    p.input.yaw = this.yaw;
    // Only walk when it roughly faces the goal; otherwise turn on the spot.
    p.input.f = Math.abs(turn) < 1.1 ? 1 : 0;
    p.input.s = 0;
    p.input.vac = vac;
  }

  /** The nearest piece it can see: close enough and nothing solid in between. */
  nearestPiece() {
    const { p, sim } = this;
    const sight = CONFIG.bot.sight;
    let best = -1;
    let bestD = sight * sight;
    sim.dirt.forEachIn(p.x - sight, p.x + sight, p.z - sight, p.z + sight, (id) => {
      const dx = sim.dirt.x[id] - p.x;
      const dz = sim.dirt.z[id] - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= bestD) return;
      if (sim.hall.blocksSuction(p.x, p.z, sim.dirt.x[id], sim.dirt.z[id])) return;
      bestD = d2;
      best = id;
    });
    return best;
  }

  /**
   * Chooses the area to walk to: much dirt and not far (dirt divided by the
   * way). anywhere = true takes a random dirty area instead (after getting
   * stuck, to come loose).
   */
  pickArea(anywhere) {
    const { p, sim, nav } = this;
    const dirt = sim.dirt;
    const B = CONFIG.dirt.botCell;
    const from = nav.distances(p.x, p.z);
    let best = -1;
    let bestScore = 0;
    for (let c = 0; c < dirt.botLeft.length; c++) {
      if (!dirt.botLeft[c]) continue;
      const x = ((c % dirt.botCols) + 0.5) * B - sim.hall.hw;
      const z = (Math.floor(c / dirt.botCols) + 0.5) * B - sim.hall.hd;
      const way = from[nav.cellAt(x, z)];
      if (way === Infinity) continue;
      const score = anywhere ? Math.random() : dirt.botLeft[c] / (way + 6);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best < 0) {
      this.goal = 'none'; // the hall is clean
      this.rest = 1;
      return;
    }
    const x = ((best % dirt.botCols) + 0.5) * B - sim.hall.hw;
    const z = (Math.floor(best / dirt.botCols) + 0.5) * B - sim.hall.hd;
    this.field = nav.distances(x, z);
    this.goal = 'area';
  }
}
