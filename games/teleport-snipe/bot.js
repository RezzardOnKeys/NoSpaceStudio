// Teleport Snipe – the bot you duel when you play alone. It plays by the
// same rules as a player: the same body and speed (sim.js), one shot, the
// 1 s reload, and a random teleport after every miss (the referee does
// that, host.js). It only writes into its player's input, like keys would.
//
// What it does:
// - It walks from cover to cover (a standing spot next to a wall, rock,
//   lantern or tree) and waits there a moment, looking towards where the
//   player could be: where it last saw the player or a flash, else the
//   middle of the garden.
// - It sees the player only in front of it and only when nothing is in
//   the way (no seeing through walls), and it sees the player's teleport
//   flashes like a person would.
// - After seeing the player for `reaction` seconds it zooms in, turns
//   towards the player at a limited speed and shoots, with an aiming error
//   that grows with the distance and with the player's speed. So it can
//   miss and teleport too.
// Its numbers are under `bot` in config.js.

import { CONFIG } from './config.js';
import { BOXES, SPOTS } from './map.js';
import { castShot, eyeOf } from './sim.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/** The difference between two angles, from -pi to pi. */
const angleTo = (from, to) => ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;

/** Spots on the ground right next to something that hides a body: the bot's cover. */
const COVER = SPOTS.filter(
  (s) =>
    s.y === 0 &&
    BOXES.some(
      (b) =>
        b.sight &&
        b.y1 >= 1 &&
        b.y0 < 0.5 &&
        s.x > b.x0 - 1.1 &&
        s.x < b.x1 + 1.1 &&
        s.z > b.z0 - 1.1 &&
        s.z < b.z1 + 1.1,
    ),
);

export class Bot {
  /** me: the bot's player; other: the player it duels (both from sim.js). */
  constructor(me, other) {
    this.me = me;
    this.other = other;
    this.reset();
  }

  /** A new round: forget everything. */
  reset() {
    this.goal = null; // the cover spot it walks to
    this.wait = 0; // seconds it still waits at its cover
    this.seen = 0; // seconds it has seen the player without a break
    this.lastSeen = null; // { x, y, z } where it last saw the player (or a flash)
    this.lastAge = 99; // seconds since then
    this.pitch = 0;
    this.aimError = null; // the offset of the current aim, chosen once per aim
    this.steady = 0; // seconds the aim has been on target
    this.stuck = 0;
    this.lastPos = null;
    this.clock = 0;
  }

  /** The other player teleported: the bot notices the flash where it can see it. */
  noticeFlash(spot) {
    const top = { x: spot.x, y: spot.y + CONFIG.teleport.flashHeight * 0.6, z: spot.z };
    if (this.canSee(top, false)) {
      this.lastSeen = { x: spot.x, y: spot.y, z: spot.z };
      this.lastAge = 0;
    }
  }

  /** Is point p in front of the bot (within its view) and is nothing in the way? */
  canSee(p, needView = true) {
    const me = this.me;
    const ox = me.x;
    const oy = eyeOf(me);
    const oz = me.z;
    const dx = p.x - ox;
    const dy = p.y - oy;
    const dz = p.z - oz;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    if (needView) {
      const look = Math.atan2(-dx, -dz);
      if (Math.abs(angleTo(me.yaw, look)) > (CONFIG.bot.fov / 2) * DEG) return false;
    }
    const hit = castShot(ox, oy, oz, dx / dist, dy / dist, dz / dist, []);
    return hit.dist >= dist - 0.2;
  }

  /** Can the bot see the other player (its head or its chest)? */
  seesOther() {
    const o = this.other;
    if (!o.alive) return false;
    const h = o.crouching ? CONFIG.move.crouchHeight : CONFIG.move.height;
    return this.canSee({ x: o.x, y: o.y + h - 0.2, z: o.z }) || this.canSee({ x: o.x, y: o.y + h * 0.55, z: o.z });
  }

  /** A new cover spot at a good distance, if possible. */
  pickCover() {
    const B = CONFIG.bot;
    const me = this.me;
    const near = COVER.filter((s) => {
      const d = Math.hypot(s.x - me.x, s.z - me.z);
      return d >= B.coverMin && d <= B.coverMax;
    });
    const list = near.length ? near : COVER;
    this.goal = list[Math.floor(Math.random() * list.length)];
    this.stuck = 0;
  }

  /** Turns the view towards (yaw, pitch) at the bot's turning speed. */
  turn(yaw, pitch, dt) {
    const step = CONFIG.bot.turnRate * dt;
    const dy = angleTo(this.me.input.yaw, yaw);
    this.me.input.yaw += Math.max(-step, Math.min(step, dy));
    const dp = pitch - this.pitch;
    this.pitch += Math.max(-step, Math.min(step, dp));
    return Math.abs(dy) + Math.abs(dp);
  }

  /**
   * One step of the rules (dt seconds) while a round is played. Sets the
   * bot's keys and returns a shot { ox, oy, oz, dx, dy, dz } when it pulls
   * the trigger, else null.
   */
  think(dt) {
    const B = CONFIG.bot;
    const me = this.me;
    const inp = me.input;
    inp.f = inp.s = 0;
    inp.jump = false;
    inp.crouch = false;
    if (!me.alive) return null;
    this.lastAge += dt;
    this.clock += dt;

    if (this.seesOther()) {
      this.seen += dt;
      this.lastSeen = { x: this.other.x, y: this.other.y, z: this.other.z };
      this.lastAge = 0;
    } else {
      this.seen = 0;
      this.aimError = null;
      this.steady = 0;
    }

    if (this.seen >= B.reaction) return this.aim(dt);
    inp.zoom = false;
    this.walk(dt);
    return null;
  }

  /** Aims at the other player and shoots once the aim has been steady. */
  aim(dt) {
    const B = CONFIG.bot;
    const me = this.me;
    const o = this.other;
    me.input.zoom = true;
    const ox = me.x;
    const oy = eyeOf(me);
    const oz = me.z;
    const h = o.crouching ? CONFIG.move.crouchHeight : CONFIG.move.height;
    const tx = o.x - ox;
    const ty = o.y + h * 0.6 - oy;
    const tz = o.z - oz;
    const dist = Math.hypot(tx, ty, tz);
    if (!this.aimError) {
      // The error of this aim: a random direction, a size from distance and speed.
      const speed = Math.hypot(o.vx, o.vz);
      const size = (B.errorBase + B.errorPerMeter * dist + B.errorPerSpeed * speed) * DEG;
      const r = size * Math.sqrt(Math.random());
      const a = Math.random() * TAU;
      this.aimError = { yaw: Math.cos(a) * r, pitch: Math.sin(a) * r };
    }
    const yaw = Math.atan2(-tx, -tz) + this.aimError.yaw;
    const pitch = Math.atan2(ty, Math.hypot(tx, tz)) + this.aimError.pitch;
    const off = this.turn(yaw, pitch, dt);
    this.steady = off < 0.3 * DEG ? this.steady + dt : 0;
    if (this.steady < B.settle || me.reload > 0) return null;
    this.aimError = null; // a new error for the next shot
    this.steady = 0;
    const cp = Math.cos(this.pitch);
    return {
      ox,
      oy,
      oz,
      dx: -Math.sin(me.input.yaw) * cp,
      dy: Math.sin(this.pitch),
      dz: -Math.cos(me.input.yaw) * cp,
    };
  }

  /** Walks to cover, waits there and looks towards where the player could be. */
  walk(dt) {
    const B = CONFIG.bot;
    const me = this.me;
    const inp = me.input;
    if (!this.goal) this.pickCover();
    const gx = this.goal.x - me.x;
    const gz = this.goal.z - me.z;
    const gd = Math.hypot(gx, gz);

    if (gd > 0.6 && this.wait <= 0) {
      // Walk there: the keys point towards the goal, whatever the bot looks at.
      const fx = -Math.sin(inp.yaw);
      const fz = -Math.cos(inp.yaw);
      inp.f = (gx * fx + gz * fz) / gd;
      inp.s = (gx * Math.cos(inp.yaw) - gz * Math.sin(inp.yaw)) / gd;
      // Not getting anywhere (a wall, a lantern): jump, then try another spot.
      if (!this.lastPos) this.lastPos = { x: me.x, z: me.z, t: 0 };
      this.lastPos.t += dt;
      if (this.lastPos.t > 0.7) {
        const moved = Math.hypot(me.x - this.lastPos.x, me.z - this.lastPos.z);
        if (moved < 0.4) {
          inp.jump = true;
          this.stuck += 1;
          if (this.stuck > 2) this.pickCover();
        }
        this.lastPos = { x: me.x, z: me.z, t: 0 };
      }
      if (gd < 1.2) this.wait = B.waitMin + Math.random() * (B.waitMax - B.waitMin);
    } else {
      this.wait -= dt;
      if (this.wait <= 0) this.pickCover();
    }

    // Look towards where the player was last seen, else towards the middle,
    // sweeping a little from side to side.
    const at = this.lastSeen && this.lastAge < B.forget ? this.lastSeen : { x: 0, y: 0, z: 0 };
    const sweep = this.lastAge < B.forget ? 0 : Math.sin(this.clock * 1.1) * 0.7;
    const lx = at.x - me.x;
    const lz = at.z - me.z;
    this.turn(Math.atan2(-lx, -lz) + sweep, 0, dt * 0.6);
  }
}
