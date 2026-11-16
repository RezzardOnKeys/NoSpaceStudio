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
      part('shelf', -16, -10, -12.7, -11.9, 2.4), // along the back wall
      part('shelf', -12.4, -11.6, -8, -2.5, 2.4), // makes a lane next to the start
      part('shelf', -7, -2, -4.6, -3.8, 2.4),
      part('bench', -8.5, -5.5, 3, 4.2, 0.9),
      part('bench', -14.5, -9.5, 11.7, 12.7, 0.9), // against the front wall
      part('crates', -6, -4.6, -9.2, -7.8, 1.4),
      part('crates', -4.5, -3.6, -8.8, -7.9, 0.7),
      part('crates', -1.2, 0.2, 7.2, 8.6, 1.4),
      part('crates', -18.6, -17.4, -11.6, -10.4, 2.1),
      part('barrel', -17.6, -16.7, 9, 9.9, 1.1),
      part('barrel', -16.5, -15.6, 10.2, 11.1, 1.1),
      part('barrel', -3.2, -2.3, 10.6, 11.5, 1.1),
      part('post', -10.25, -9.75, 5.75, 6.25, H),
      part('post', -10.25, -9.75, -6.25, -5.75, H),
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
