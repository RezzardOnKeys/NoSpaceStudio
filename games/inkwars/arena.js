// Inkwars – the arena as plain numbers: boxes and ramps, their heights, the
// spawn points and simple ray checks. No 3D objects here (see arenaView.js).
// "dir" is the direction in which a ramp rises: 0:+x 1:-x 2:+z 3:-z

import { CONFIG } from './config.js';
export function shapeHeight(s, x, z) {
  if (s.kind === 'box') return s.h;
  let t = 0;
  if (s.dir === 0) t = (x - s.x0) / (s.x1 - s.x0);
  else if (s.dir === 1) t = (s.x1 - x) / (s.x1 - s.x0);
  else if (s.dir === 2) t = (z - s.z0) / (s.z1 - s.z0);
  else t = (s.z1 - z) / (s.z1 - s.z0);
  t = Math.min(1, Math.max(0, t));
  return s.hLow + (s.h - s.hLow) * t;
}
const C = {
  base: 0xf7f6f2,
  mint: 0xbfdcc0, // sage green
  sky: 0xdde1e7, // light grey
  rose: 0xf4bcb6, // salmon
  lilac: 0xe9e4da, // sand white
  sand: 0xf3dcc0,
};
function box(x0, x1, z0, z1, h, color, y0 = 0, lock = 0) {
  return { kind: 'box', x0, x1, z0, z1, y0, h, hLow: h, dir: 0, color, lock };
}
function ramp(x0, x1, z0, z1, h, dir, color) {
  return { kind: 'ramp', x0, x1, z0, z1, y0: 0, h, hLow: 0, dir, color, lock: 0 };
}
function mirror(s) {
  const dir = [1, 0, 3, 2][s.dir];
  return { ...s, x0: -s.x1, x1: -s.x0, z0: -s.z1, z1: -s.z0, dir, lock: s.lock === 1 ? 2 : s.lock };
}
export class Arena {
  constructor() {
    this.W = CONFIG.arena.width;
    this.D = CONFIG.arena.depth;
    this.hw = this.W / 2;
    this.hd = this.D / 2;
    this.shapes = [];
    // One half is built by hand, the other is its point mirror, so the map is fair.
    const half = [
      box(-28, -22, -6, 6, 1.2, C.base, 0, 1), // base
      ramp(-22, -18, -3, 3, 1.2, 1, C.sand),
      box(-14, -12, -11, -6, 1.6, C.rose),
      box(-9, -7, 2, 5, 1.2, C.lilac),
      box(-16, -10, 8, 14, 1.5, C.sky), // side platform
      ramp(-15, -11, 4, 8, 1.5, 2, C.sand),
      box(-20, -18, -14, -12, 3, C.mint), // pillar
      box(-3, 3, 11, 12, 1.4, C.rose),
      box(-8, -6, -10, -8, 1.3, C.mint),
      ramp(5, 11, -2, 2, 2, 1, C.sand), // way up to the middle
    ];
    const all = [
      ...half,
      ...half.map(mirror),
      box(-5, 5, -4, 4, 2, C.sky), // middle platform
      box(-2, 2, -2, 2, 3.6, C.lilac, 2), // tower on top of it
    ];
    all.forEach((s, i) => this.shapes.push({ ...s, id: i }));
  }
  spawn(team, slot) {
    const side = team === 1 ? -1 : 1;
    return {
      x: side * 25,
      y: 1.2,
      z: slot === 0 ? -2 * side : 2 * side,
      yaw: (side * Math.PI) / 2,
    };
  }
  inBounds(x, z) {
    return x >= -this.hw && x <= this.hw && z >= -this.hd && z <= this.hd;
  }
  heightAt(x, z) {
    if (!this.inBounds(x, z)) return 100;
    let h = 0;
    for (const s of this.shapes) {
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
        const sh = shapeHeight(s, x, z);
        if (sh > h) h = sh;
      }
    }
    return h;
  }
  /** The highest part at this spot (null = bare floor). */
  shapeAt(x, z) {
    let h = 0;
    let best = null;
    for (const s of this.shapes) {
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
        const sh = shapeHeight(s, x, z);
        if (sh > h) {
          h = sh;
          best = s;
        }
      }
    }
    return best;
  }
  /** Is there a free line of sight between two points? */
  rayClear(ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, by - ay, bz - az);
    const n = Math.max(1, Math.ceil(d / 0.4));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (ay + (by - ay) * t < this.heightAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }
  /** A ray against the terrain. Gives the hit point or the end point. */
  raycast(o, d, tMin, tMax, out) {
    const under = (t) => o.y + d.y * t <= this.heightAt(o.x + d.x * t, o.z + d.z * t);
    for (let t = tMin; t <= tMax; t += 0.25) {
      if (under(t)) {
        // narrow the hit down to about a centimetre between the last two samples
        let lo = Math.max(tMin, t - 0.25);
        let hi = t;
        if (lo < t && !under(lo)) {
          for (let i = 0; i < 5; i++) {
            const mid = (lo + hi) / 2;
            if (under(mid)) hi = mid;
            else lo = mid;
          }
        }
        out.set(o.x + d.x * hi, o.y + d.y * hi, o.z + d.z * hi);
        return true;
      }
    }
    out.set(o.x + d.x * tMax, o.y + d.y * tMax, o.z + d.z * tMax);
    return false;
  }
}
