// Dust Dash – walking distances in the hall. The floor is cut into squares
// of half a metre; from any spot this file works out how far it is to walk
// to every other square, around the obstacles. The rules use it to find a
// fair place for a delivery, the bot (bot.js) to find its way.

import { CONFIG } from './config.js';

const CELL = 0.5;
const DIAGONAL = Math.SQRT2;

export class Nav {
  constructor(hall) {
    this.hall = hall;
    this.cols = Math.round(hall.W / CELL);
    this.rows = Math.round(hall.D / CELL);
    const n = this.cols * this.rows;
    this.walk = new Uint8Array(n); // 1: a player can stand in the middle of this square
    this.roomy = new Uint8Array(n); // 1: there is room for a delivery box around it
    for (let c = 0; c < n; c++) {
      const x = this.cellX(c);
      const z = this.cellZ(c);
      this.walk[c] = hall.free(x, z, CONFIG.move.radius) ? 1 : 0;
      this.roomy[c] = hall.free(x, z, 1.1) ? 1 : 0;
    }
  }

  cellX(c) {
    return ((c % this.cols) + 0.5) * CELL - this.hall.hw;
  }
  cellZ(c) {
    return (Math.floor(c / this.cols) + 0.5) * CELL - this.hall.hd;
  }

  /** The walkable square at (x, z), or the nearest one next to it. */
  cellAt(x, z) {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor((x + this.hall.hw) / CELL)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor((z + this.hall.hd) / CELL)));
    for (let ring = 0; ring <= 3; ring++) {
      for (let r = row - ring; r <= row + ring; r++) {
        for (let c = col - ring; c <= col + ring; c++) {
          if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) continue;
          if (this.walk[r * this.cols + c]) return r * this.cols + c;
        }
      }
    }
    return row * this.cols + col;
  }

  /**
   * The next point to walk to on the shortest way to a goal. `field` must
   * be distances(goalX, goalZ); the way simply goes downhill in it. Looks
   * `steps` squares ahead, so the walk does not zigzag from square to square.
   */
  toward(field, x, z, steps) {
    const { cols, rows, walk } = this;
    let cell = this.cellAt(x, z);
    for (let i = 0; i < steps; i++) {
      const col = cell % cols;
      const row = (cell - col) / cols;
      let best = cell;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
          const next = r * cols + c;
          if (!walk[next]) continue;
          if (dr && dc && (!walk[row * cols + c] || !walk[r * cols + col])) continue;
          if (field[next] < field[best]) best = next;
        }
      }
      if (best === cell) break; // arrived
      cell = best;
    }
    return { x: this.cellX(cell), z: this.cellZ(cell), left: field[cell] };
  }

  /**
   * Walking distance in metres from (x, z) to every square (Infinity where
   * nobody can get to). Squares are visited from near to far.
   */
  distances(x, z) {
    const { cols, rows, walk } = this;
    const dist = new Float64Array(cols * rows).fill(Infinity);
    // A small heap: the square with the shortest way so far is always on top.
    const heap = [];
    const push = (cell, d) => {
      let i = heap.length;
      heap.push([cell, d]);
      while (i > 0) {
        const up = (i - 1) >> 1;
        if (heap[up][1] <= d) break;
        [heap[up], heap[i]] = [heap[i], heap[up]];
        i = up;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let small = i;
          if (l < heap.length && heap[l][1] < heap[small][1]) small = l;
          if (r < heap.length && heap[r][1] < heap[small][1]) small = r;
          if (small === i) break;
          [heap[small], heap[i]] = [heap[i], heap[small]];
          i = small;
        }
      }
      return top;
    };

    const start = this.cellAt(x, z);
    dist[start] = 0;
    push(start, 0);
    while (heap.length) {
      const [cell, d] = pop();
      if (d > dist[cell]) continue;
      const col = cell % cols;
      const row = (cell - col) / cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
          const next = r * cols + c;
          if (!walk[next]) continue;
          // No cutting corners: a diagonal step needs both squares beside it.
          if (dr && dc && (!walk[row * cols + c] || !walk[r * cols + col])) continue;
          const nd = d + (dr && dc ? DIAGONAL : 1) * CELL;
          if (nd < dist[next]) {
            dist[next] = nd;
            push(next, nd);
          }
        }
      }
    }
    return dist;
  }
}
