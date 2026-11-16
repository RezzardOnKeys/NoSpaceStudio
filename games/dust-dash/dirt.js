// Dust Dash – the pieces of dirt as plain numbers: where every piece lies,
// what kind it is and whether it is still there. All of it is made from one
// number (the seed), so two browsers that get the same seed build exactly
// the same pieces with the same ids. That is why this file only uses plain
// sums and square roots: those give the same result in every browser.
// No 3D objects here (see dirtView.js).
//
// Kinds: 0 dust bunny, 1 dirt crumb, 2 wood shaving.

import { CONFIG } from './config.js';

export const KINDS = 3;
const CELL = 1; // size of the squares of the search grid, in metres

// Places around a piece where a player could stand to vacuum it.
const STANDS = [];
for (let i = -3; i <= 3; i++)
  for (let j = -3; j <= 3; j++) {
    const dx = i * 0.4;
    const dz = j * 0.4;
    if (dx * dx + dz * dz <= 1.3 * 1.3) STANDS.push([dx, dz]);
  }

/** Distance from a point to a box on the floor (0 inside). */
function distToPart(p, x, z) {
  const dx = x - Math.max(p.x0, Math.min(p.x1, x));
  const dz = z - Math.max(p.z0, Math.min(p.z1, z));
  return Math.sqrt(dx * dx + dz * dz);
}

export class Dirt {
  constructor(hall) {
    this.hall = hall;
    const n = CONFIG.dirt.pieces;
    this.count = n;
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.there = new Uint8Array(n); // 1 while the piece still lies on the floor
    this.left = 0;
    // Search grid: which pieces lie in which square metre.
    this.cols = Math.ceil(hall.W / CELL);
    this.rows = Math.ceil(hall.D / CELL);
    this.cellStart = new Uint32Array(this.cols * this.rows + 1);
    this.cellItems = new Uint32Array(n);
    // Coarse grid for the bot: how many pieces are left in each big square.
    const B = CONFIG.dirt.botCell;
    this.botCols = Math.ceil(hall.W / B);
    this.botRows = Math.ceil(hall.D / B);
    this.botLeft = new Uint16Array(this.botCols * this.botRows);
    this.build(1);
  }

  cellOf(x, z) {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor((x + this.hall.hw) / CELL)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor((z + this.hall.hd) / CELL)));
    return r * this.cols + c;
  }
  botCellOf(x, z) {
    const B = CONFIG.dirt.botCell;
    const c = Math.min(this.botCols - 1, Math.max(0, Math.floor((x + this.hall.hw) / B)));
    const r = Math.min(this.botRows - 1, Math.max(0, Math.floor((z + this.hall.hd) / B)));
    return r * this.botCols + c;
  }

  /** Lays out all pieces again from a seed (a whole number above 0). */
  build(seed) {
    const hall = this.hall;
    const { hw, hd } = hall;
    let s = (Math.floor(seed) % 2147483646) + 1;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const solid = hall.parts.filter((p) => p.kind !== 'bench');
    const benches = hall.parts.filter((p) => p.kind === 'bench');

    // Extra dirty spots: [x, z, radius]
    const patches = [];
    for (let i = 0; i < CONFIG.dirt.patches; i++) {
      patches.push([(rnd() * 2 - 1) * (hw - 1), (rnd() * 2 - 1) * (hd - 1), 1.2 + rnd() * 1.8]);
    }

    /** How dirty a spot is, from 0 (never) to 1 (always a piece). */
    const dirtiness = (x, z) => {
      let d = 0.14; // the open floor
      const toWallX = hw - Math.abs(x);
      const toWallZ = hd - Math.abs(z);
      d += 0.5 * Math.max(0, 1 - Math.min(toWallX, toWallZ) / 1.6); // along the walls
      d += 0.35 * Math.max(0, 1 - (toWallX + toWallZ) / 5); // in the corners
      let near = 9;
      for (const p of solid) near = Math.min(near, distToPart(p, x, z));
      let nearBench = 9;
      for (const p of benches) nearBench = Math.min(nearBench, distToPart(p, x, z));
      d += 0.4 * Math.max(0, 1 - near / 1.2); // around shelves, crates, barrels, posts
      d += 0.3 * Math.max(0, 1 - nearBench / 1.5); // around workbenches
      if (nearBench === 0) d += 0.5; // and most of all under them
      for (const [px, pz, r] of patches) {
        const q = ((x - px) * (x - px) + (z - pz) * (z - pz)) / (r * r);
        if (q < 1) d += 0.5 * (1 - q);
      }
      return { d: Math.min(1, d), nearBench, nearWall: Math.min(toWallX, toWallZ) };
    };

    /** Can a player stand somewhere and reach this spot with the nozzle? */
    const reachable = (x, z) => {
      for (const [dx, dz] of STANDS) {
        if (hall.free(x + dx, z + dz, CONFIG.move.radius) && !hall.blocksSuction(x + dx, z + dz, x, z))
          return true;
      }
      return false;
    };

    let n = 0;
    let tries = 0;
    while (n < this.count && tries < this.count * 60) {
      tries++;
      const x = (rnd() * 2 - 1) * (hw - 0.12);
      const z = (rnd() * 2 - 1) * (hd - 0.12);
      const roll = rnd();
      const kindRoll = rnd();
      const spot = dirtiness(x, z);
      if (roll >= spot.d) continue;
      if (solid.some((p) => distToPart(p, x, z) < 0.06)) continue; // not inside a shelf
      if (!reachable(x, z)) continue;
      // Shavings lie around the workbenches, fluff likes the walls.
      let kind;
      if (spot.nearBench < 2.5) kind = kindRoll < 0.65 ? 2 : kindRoll < 0.85 ? 0 : 1;
      else if (spot.nearWall < 1.6) kind = kindRoll < 0.6 ? 0 : kindRoll < 0.93 ? 1 : 2;
      else kind = kindRoll < 0.45 ? 0 : kindRoll < 0.9 ? 1 : 2;
      this.x[n] = x;
      this.z[n] = z;
      this.kind[n] = kind;
      n++;
    }
    // Should the hall ever be too full to place every piece, the rest is
    // marked as already gone (it keeps its id on both screens).
    this.there.fill(1, 0, n);
    this.there.fill(0, n);
    this.left = n;

    // Fill the search grid (count per square, then sort the ids in).
    this.cellStart.fill(0);
    this.botLeft.fill(0);
    for (let i = 0; i < n; i++) {
      this.cellStart[this.cellOf(this.x[i], this.z[i]) + 1]++;
      this.botLeft[this.botCellOf(this.x[i], this.z[i])]++;
    }
    for (let c = 0; c < this.cols * this.rows; c++) this.cellStart[c + 1] += this.cellStart[c];
    const fill = this.cellStart.slice(0, -1);
    for (let i = 0; i < n; i++) this.cellItems[fill[this.cellOf(this.x[i], this.z[i])]++] = i;
  }

  /** Takes a piece away. Returns false if it was already gone. */
  remove(id) {
    if (!this.there[id]) return false;
    this.there[id] = 0;
    this.left--;
    this.botLeft[this.botCellOf(this.x[id], this.z[id])]--;
    return true;
  }

  /** Puts a piece back (the guest took it too early, the host said no). */
  restore(id) {
    if (this.there[id]) return;
    this.there[id] = 1;
    this.left++;
    this.botLeft[this.botCellOf(this.x[id], this.z[id])]++;
  }

  /** The numbers of all pieces that are gone (for a guest who joins late). */
  gone() {
    const ids = [];
    for (let id = 0; id < this.count; id++) if (!this.there[id]) ids.push(id);
    return ids;
  }

  /** Calls fn(id) for every piece still there in the squares touched by the box. */
  forEachIn(x0, x1, z0, z1, fn) {
    const { hw, hd } = this.hall;
    const c0 = Math.max(0, Math.floor((x0 + hw) / CELL));
    const c1 = Math.min(this.cols - 1, Math.floor((x1 + hw) / CELL));
    const r0 = Math.max(0, Math.floor((z0 + hd) / CELL));
    const r1 = Math.min(this.rows - 1, Math.floor((z1 + hd) / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * this.cols + c;
        for (let k = this.cellStart[cell]; k < this.cellStart[cell + 1]; k++) {
          const id = this.cellItems[k];
          if (this.there[id]) fn(id);
        }
      }
    }
  }
}
