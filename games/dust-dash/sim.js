// Dust Dash – the rules. For now: the players and how they walk (later
// also vacuuming, boxes and power-ups). The rules run in fixed steps of
// STEP seconds, so the same keys give the same way on every computer.
//
// Directions: yaw 0 looks along -z, a positive yaw turns to the left.

import { CONFIG } from './config.js';

export class Sim {
  constructor(hall) {
    this.hall = hall;
    this.players = []; // in the order of the seats
  }

  reset() {
    this.players = [];
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
      // What the player wants: f forward (1) or back (-1), s right (1) or
      // left (-1), yaw the view direction, vac holding the vacuum button.
      input: { f: 0, s: 0, yaw: s.yaw, vac: false },
    };
    this.players.push(p);
    return p;
  }

  /** One step of walking for one player. */
  updatePlayer(p, dt) {
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
    const max = p.vacuuming ? M.vacuumSpeed : M.walkSpeed;

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
}
