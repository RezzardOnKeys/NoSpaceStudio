// Dust Dash – the hall as plain numbers: its size, the obstacles as boxes,
// the start points and the collision check. No 3D objects here (see
// hallView.js). x runs along the long side, z along the short side, the
// middle of the hall is (0, 0).
//
// Kinds of obstacles (hallView.js draws each kind differently):
//   shelf   tall open shelf with boxes        bench   workbench with tools
//   crates  a stack of wooden crates          barrel  a barrel (collides as a square)
//   post    a post that holds the roof

import { CONFIG } from './config.js';

const part = (kind, x0, x1, z0, z1, h) => ({ kind, x0, x1, z0, z1, h });
/** The same obstacle on the other side of the hall (turned around the middle). */
const mirror = (p) => ({ ...p, x0: -p.x1, x1: -p.x0, z0: -p.z1, z1: -p.z0 });

export class Hall {
  constructor() {
    this.W = CONFIG.hall.width;
    this.D = CONFIG.hall.depth;
    this.H = CONFIG.hall.height;
    this.hw = this.W / 2;
    this.hd = this.D / 2;
    const H = this.H;

    // One half is laid out by hand, the other is its point mirror, so both
    // start points have exactly the same hall in front of them.
    const half = [
      // shelves: they make the lanes
      part('shelf', -24, -17, -17.7, -16.9, 2.4), // along the back wall
      part('shelf', -16.4, -15.6, -11, -4, 2.4), // a lane next to the start
      part('shelf', -22, -21.2, 5, 11, 2.4),
      part('shelf', -12, -6, -5.4, -4.6, 2.4),
      part('shelf', -10, -4, 12, 12.8, 2.4),
      part('shelf', -3, -2.2, -14, -9, 2.4),
      // workbenches: dirt lies under them
      part('bench', -12, -8.5, 4, 5.2, 0.9),
      part('bench', -20, -14, 16.7, 17.7, 0.9), // against the front wall
      part('bench', -9, -6, -13.5, -12.3, 0.9),
      // crates and barrels
      part('crates', -8.4, -7, -10.2, -8.8, 1.4),
      part('crates', -8.3, -7.4, -8.7, -7.8, 0.7),
      part('crates', -1.6, -0.2, 8.2, 9.6, 1.4),
      part('crates', -26.6, -25.4, -16.6, -15.4, 2.1),
      part('crates', -14, -12.6, 9, 10.4, 1.4),
      part('crates', -12.5, -11.6, 9.2, 10.1, 0.7),
      part('crates', -20.5, -19.1, -9.5, -8.1, 0.7),
      part('barrel', -25.6, -24.7, 13, 13.9, 1.1),
      part('barrel', -24.5, -23.6, 14.2, 15.1, 1.1),
      part('barrel', -4.2, -3.3, 15.6, 16.5, 1.1),
      part('barrel', -13, -12.1, -15, -14.1, 1.1),
      part('barrel', -2, -1.1, 3.6, 4.5, 1.1),
      // posts under the two long roof beams (hallView.js draws the beams at z = -9 and 9)
      part('post', -18.25, -17.75, 8.75, 9.25, H),
      part('post', -18.25, -17.75, -9.25, -8.75, H),
      part('post', -6.25, -5.75, 8.75, 9.25, H),
      part('post', -6.25, -5.75, -9.25, -8.75, H),
    ];
    this.parts = [
      ...half,
      ...half.map(mirror),
      part('bench', -2.6, 2.6, -0.7, 0.7, 0.9), // the big workbench in the middle
    ].map((p, id) => ({ ...p, id }));
  }

  /** Where the player of a seat starts: opposite ends, looking at the middle. */
  start(seat) {
    const side = seat % 2 === 0 ? -1 : 1;
    return { x: side * (this.hw - 3), z: 0, yaw: (side * Math.PI) / 2 };
  }

  /** Is a circle of radius r at (x, z) inside the hall and clear of all obstacles? */
  free(x, z, r) {
    if (Math.abs(x) > this.hw - r || Math.abs(z) > this.hd - r) return false;
    for (const p of this.parts) {
      const dx = x - Math.max(p.x0, Math.min(p.x1, x));
      const dz = z - Math.max(p.z0, Math.min(p.z1, z));
      if (dx * dx + dz * dz < r * r) return false;
    }
    return true;
  }

  /**
   * Is there a shelf, a crate, a barrel or a post between a player at
   * (ax, az) and a piece of dirt at (bx, bz)? The vacuum does not pull
   * through those. Workbenches do not count: the nozzle fits under them.
   */
  blocksSuction(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dz * dz) / 0.2));
    for (let i = 1; i <= n; i++) {
      const x = ax + (dx * i) / n;
      const z = az + (dz * i) / n;
      for (const p of this.parts) {
        if (p.kind !== 'bench' && x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return true;
      }
    }
    return false;
  }

  /**
   * How much free floor lies straight ahead of (x, z) in direction yaw for
   * something `half` metres wide to each side (a nozzle), up to `max`
   * metres. Walls, shelves, crates, barrels and posts end it; workbenches
   * do not (a nozzle fits under them).
   */
  roomAhead(x, z, yaw, half, max) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    for (let d = 0.1; d <= max; d += 0.05) {
      for (const side of [-half, 0, half]) {
        const px = x + fx * d - fz * side;
        const pz = z + fz * d + fx * side;
        if (Math.abs(px) > this.hw || Math.abs(pz) > this.hd) return d - 0.05;
        for (const p of this.parts) {
          if (p.kind !== 'bench' && px > p.x0 && px < p.x1 && pz > p.z0 && pz < p.z1) return d - 0.05;
        }
      }
    }
    return max;
  }

  /**
   * Pushes a circle of radius r at pos (an object with x and z) out of the
   * walls and obstacles. Moving along a wall keeps working: only the part
   * of the step that goes into the wall is taken away.
   */
  collide(pos, r) {
    for (let pass = 0; pass < 2; pass++) {
      for (const p of this.parts) {
        const nx = Math.max(p.x0, Math.min(p.x1, pos.x));
        const nz = Math.max(p.z0, Math.min(p.z1, pos.z));
        const dx = pos.x - nx;
        const dz = pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
          // The middle is outside the box: push straight away from its edge.
          const d = Math.sqrt(d2);
          pos.x = nx + (dx / d) * r;
          pos.z = nz + (dz / d) * r;
        } else {
          // The middle is inside the box: leave through the nearest side.
          const left = pos.x - p.x0;
          const right = p.x1 - pos.x;
          const back = pos.z - p.z0;
          const front = p.z1 - pos.z;
          const least = Math.min(left, right, back, front);
          if (least === left) pos.x = p.x0 - r;
          else if (least === right) pos.x = p.x1 + r;
          else if (least === back) pos.z = p.z0 - r;
          else pos.z = p.z1 + r;
        }
      }
      pos.x = Math.max(-this.hw + r, Math.min(this.hw - r, pos.x));
      pos.z = Math.max(-this.hd + r, Math.min(this.hd - r, pos.z));
    }
  }
}
