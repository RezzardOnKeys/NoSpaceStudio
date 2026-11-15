// Inkwars – path finding for bots: a 1 metre grid over the arena, A* on it.
// The only way up is a ramp; jumping down is allowed everywhere.
const MAX_RISE = 0.5;
export class Nav {
  constructor(arena) {
    this.arena = arena;
    this.heap = [];
    this.cols = arena.W;
    this.rows = arena.D;
    const n = this.cols * this.rows;
    this.h = new Float32Array(n);
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.from = new Int32Array(n);
    this.state = new Uint8Array(n);
    for (let i = 0; i < n; i++) this.h[i] = arena.heightAt(this.cx(i), this.cz(i));
  }
  cx(i) {
    return (i % this.cols) + 0.5 - this.arena.hw;
  }
  cz(i) {
    return Math.floor(i / this.cols) + 0.5 - this.arena.hd;
  }
  cell(x, z) {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(x + this.arena.hw)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(z + this.arena.hd)));
    return r * this.cols + c;
  }
  push(i) {
    const hp = this.heap;
    hp.push(i);
    let k = hp.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (this.f[hp[p]] <= this.f[hp[k]]) break;
      [hp[p], hp[k]] = [hp[k], hp[p]];
      k = p;
    }
  }
  pop() {
    const hp = this.heap;
    const top = hp[0];
    const last = hp.pop();
    if (hp.length) {
      hp[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < hp.length && this.f[hp[l]] < this.f[hp[m]]) m = l;
        if (r < hp.length && this.f[hp[r]] < this.f[hp[m]]) m = r;
        if (m === k) break;
        [hp[m], hp[k]] = [hp[k], hp[m]];
        k = m;
      }
    }
    return top;
  }
  canStep(a, b) {
    return this.h[b] - this.h[a] <= MAX_RISE;
  }
  /** Waypoints from start to target, or null if the target cannot be reached. */
  findPath(sx, sz, tx, tz) {
    const start = this.cell(sx, sz);
    const goal = this.cell(tx, tz);
    this.state.fill(0);
    this.heap.length = 0;
    this.g[start] = 0;
    this.f[start] = 0;
    this.from[start] = -1;
    this.state[start] = 1;
    this.push(start);
    const gc = goal % this.cols;
    const gr = Math.floor(goal / this.cols);
    while (this.heap.length) {
      const cur = this.pop();
      if (this.state[cur] === 2) continue;
      this.state[cur] = 2;
      if (cur === goal) {
        const out = [{ x: tx, z: tz }];
        let k = this.from[cur];
        while (k !== -1 && k !== start) {
          out.push({ x: this.cx(k), z: this.cz(k) });
          k = this.from[k];
        }
        return out.reverse();
      }
      const c = cur % this.cols;
      const r = Math.floor(cur / this.cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
          const nb = nr * this.cols + nc;
          if (this.state[nb] === 2 || !this.canStep(cur, nb)) continue;
          if (dr && dc) {
            // do not cut corners
            if (!this.canStep(cur, r * this.cols + nc) || !this.canStep(cur, nr * this.cols + c))
              continue;
          }
          const drop = this.h[cur] - this.h[nb] > MAX_RISE ? 2 : 0;
          const ng = this.g[cur] + (dr && dc ? 1.414 : 1) + drop;
          if (this.state[nb] === 1 && ng >= this.g[nb]) continue;
          this.g[nb] = ng;
          this.f[nb] = ng + Math.hypot(nc - gc, nr - gr);
          this.from[nb] = cur;
          this.state[nb] = 1;
          this.push(nb);
        }
      }
    }
    return null;
  }
}
