import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { Sim } from './sim.js';
// Inkwars – a bot fills the same input object as a player. It paints free
// ground, attacks enemies it can see, refills in its own water and swims
// through its own colour when the way is long.
const muzzle = new THREE.Vector3();
const aimAt = new THREE.Vector3();
export class Bot {
  constructor(actor, sim, nav) {
    this.actor = actor;
    this.sim = sim;
    this.nav = nav;
    this.target = null;
    this.path = [];
    this.pi = 0;
    this.targetT = 0;
    this.stuckT = 0;
    this.strafe = 1;
    this.strafeT = 0;
    this.errYaw = 0;
    this.errPitch = 0;
    this.errT = 0;
    this.refilling = false;
    this.seenT = 0;
    this.t = Math.random() * 10;
    this.mvx = 0;
    this.mvz = 0;
  }
  think(dt) {
    const a = this.actor;
    const inp = a.input;
    inp.moveX = 0;
    inp.moveZ = 0;
    inp.shoot = false;
    inp.jump = false;
    inp.fish = false;
    this.t += dt;
    if (!a.alive) {
      this.target = null;
      this.refilling = false;
      return;
    }
    this.errT -= dt;
    if (this.errT <= 0) {
      this.errT = 0.25 + Math.random() * 0.3;
      this.errYaw = (Math.random() - 0.5) * 0.17;
      this.errPitch = (Math.random() - 0.5) * 0.08;
    }
    const enemy = this.findEnemy();
    this.seenT = enemy ? this.seenT + dt : 0;
    const dist = enemy ? enemy.pos.distanceTo(a.pos) : 99;
    if (a.tank < 18) this.refilling = true;
    if (a.tank > 92) this.refilling = false;
    if (this.refilling && enemy && dist < 7 && a.tank > 25) this.refilling = false;
    if (this.refilling) this.refill(dt);
    else if (enemy) this.fight(enemy, dist, dt);
    else this.paintMode(dt);
  }
  findEnemy() {
    const a = this.actor;
    let best = null;
    let bd = 16;
    for (const e of this.sim.actors) {
      if (e.team === a.team || !e.alive) continue;
      const d = e.pos.distanceTo(a.pos);
      if (d >= bd) continue;
      if (e.submerged && d > 3) continue; // a bot cannot see submerged fish either
      if (
        !this.sim.arena.rayClear(a.pos.x, a.pos.y + 1.3, a.pos.z, e.pos.x, e.pos.y + 0.8, e.pos.z)
      )
        continue;
      best = e;
      bd = d;
    }
    return best;
  }
  refill(dt) {
    const a = this.actor;
    const inp = a.input;
    const here = this.sim.paint.floorTeamAt(a.pos.x, a.pos.z);
    if (a.grounded && here === a.team) {
      inp.fish = true;
    } else if (a.tank >= CONFIG.weapon.shotCost) {
      inp.aimPitch = -1.3; // shoot a puddle for itself
      inp.shoot = true;
    } else {
      const s = this.sim.arena.spawn(a.team, a.slot);
      this.setTarget(s.x, s.z);
      this.follow(dt);
    }
  }
  fight(e, dist, dt) {
    const a = this.actor;
    const inp = a.input;
    this.target = null;
    const lead = (dist / CONFIG.weapon.speed) * 0.8;
    aimAt.set(
      e.pos.x + e.vel.x * lead,
      e.pos.y + (e.morph > 0.5 ? 0.3 : 1.0),
      e.pos.z + e.vel.z * lead,
    );
    const ang = Sim.aimAngles(this.sim.muzzle(a, muzzle), aimAt);
    inp.aimYaw = ang.yaw + this.errYaw;
    inp.aimPitch = ang.pitch + this.errPitch;
    inp.shoot = dist < 13 && this.seenT > 0.3;
    this.strafeT -= dt;
    if (this.strafeT <= 0) {
      this.strafe = Math.random() < 0.5 ? -1 : 1;
      this.strafeT = 0.6 + Math.random();
    }
    const dx = (e.pos.x - a.pos.x) / Math.max(dist, 0.01);
    const dz = (e.pos.z - a.pos.z) / Math.max(dist, 0.01);
    const fwd = dist > 8 ? 1 : dist < 4 ? -0.8 : 0;
    inp.moveX = dx * fwd - dz * this.strafe * 0.8;
    inp.moveZ = dz * fwd + dx * this.strafe * 0.8;
    if (Math.random() < dt * 0.5) inp.jump = true;
  }
  paintMode(dt) {
    const a = this.actor;
    const inp = a.input;
    const paint = this.sim.paint;
    this.targetT -= dt;
    if (
      this.target &&
      this.targetT < 5.5 &&
      paint.floorTeamAt(this.target.x, this.target.z) === a.team
    )
      this.target = null;
    if (!this.target || this.targetT <= 0) this.pickTarget();
    if (!this.target) return;
    const d = this.follow(dt);
    if (d < 2.2) this.target = null;
    const here = paint.floorTeamAt(a.pos.x, a.pos.z);
    const ahead = paint.floorTeamAt(a.pos.x + this.mvx * 2.5, a.pos.z + this.mvz * 2.5);
    if (a.grounded && here === a.team && ahead === a.team && d > 5) {
      inp.fish = true; // swim through own colour
    } else {
      const base = Math.atan2(-this.mvx, -this.mvz);
      inp.aimYaw = base + Math.sin(this.t * 2.6) * 0.6;
      inp.aimPitch = -0.1 + Math.sin(this.t * 1.7) * 0.12;
      inp.shoot = true;
    }
  }
  pickTarget() {
    const a = this.actor;
    const ar = this.sim.arena;
    const cands = [];
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() * 2 - 1) * (ar.hw - 1.5);
      const z = (Math.random() * 2 - 1) * (ar.hd - 1.5);
      const team = this.sim.paint.floorTeamAt(x, z);
      if (team === a.team) continue;
      const d = Math.hypot(x - a.pos.x, z - a.pos.z);
      if (d < 3) continue;
      cands.push({ x, z, score: d - (team ? 6 : 0) + Math.random() * 8 });
    }
    cands.sort((p, q) => p.score - q.score);
    for (const c of cands.slice(0, 4)) {
      if (this.setTarget(c.x, c.z)) return;
    }
    this.target = null;
  }
  setTarget(x, z) {
    if (this.target && this.target.x === x && this.target.z === z) return true;
    const a = this.actor;
    const path = this.nav.findPath(a.pos.x, a.pos.z, x, z);
    if (!path) return false;
    this.target = { x, z };
    this.path = path;
    this.pi = 0;
    this.targetT = 7;
    this.stuckT = 0;
    return true;
  }
  /** Follows the path. Gives the distance to the target. */
  follow(dt) {
    const a = this.actor;
    const inp = a.input;
    if (!this.target) return 0;
    while (
      this.pi < this.path.length - 1 &&
      Math.hypot(this.path[this.pi].x - a.pos.x, this.path[this.pi].z - a.pos.z) < 0.8
    )
      this.pi++;
    const wp = this.path[this.pi];
    const dx = wp.x - a.pos.x;
    const dz = wp.z - a.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.mvx = dx / d;
    this.mvz = dz / d;
    inp.moveX = this.mvx;
    inp.moveZ = this.mvz;
    if (Math.hypot(a.vel.x, a.vel.z) < 0.6) {
      this.stuckT += dt;
      if (this.stuckT > 0.5) inp.jump = Math.floor(this.t * 4) % 2 === 0;
      if (this.stuckT > 1.5) this.target = null;
    } else this.stuckT = 0;
    return Math.hypot(
      this.target ? this.target.x - a.pos.x : 0,
      this.target ? this.target.z - a.pos.z : 0,
    );
  }
}
