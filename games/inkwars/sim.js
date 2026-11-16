// Inkwars – the rules: movement, shooting, water, hits. The simulation knows
// neither keyboard nor screen. Every character only gets an input object per
// step, no matter whether it comes from a person, a bot or the network.
// Only the referee's browser runs step(). A party guest moves its own
// character with the same rules (updateActor) and flies the water drops,
// but paints nothing and hits nobody (authority = false).

import * as THREE from './vendor/three.module.js';
import { CONFIG, STEP } from './config.js';
export const emptyInput = () => ({
  moveX: 0,
  moveZ: 0,
  aimYaw: 0,
  aimPitch: 0,
  // The direction the player's camera looks (people only, NaN for bots).
  // The trail of a shot runs that way, which is where W swims (see drip).
  lookYaw: NaN,
  shoot: false,
  jump: false,
  fish: false,
});
export class Actor {
  constructor(id, team, slot, isBot) {
    this.id = id;
    this.team = team;
    this.slot = slot;
    this.isBot = isBot;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.input = emptyInput();
    this.fish = false;
    this.morph = 0; // 0 = human, 1 = fish
    this.grounded = true;
    this.climbing = false;
    this.inOwnInk = false;
    this.inEnemyInk = false;
    this.tank = CONFIG.weapon.tank;
    this.hp = CONFIG.actor.hp;
    this.alive = true;
    this.respawnT = 0;
    this.invuln = 0;
    this.kills = 0;
    this.fireT = 0;
    this.hitT = 99;
    this.airT = 0;
    this.canJump = true;
    this.prevJump = false;
    // Party host: how far back in time (seconds) the shots of this character
    // are judged, because its player saw the others that late (see poseAt).
    this.rewind = 0;
    // Party host: true for the guest's character, which is moved by the
    // guest's keys step by step (feed.js) instead of by step().
    this.external = false;
  }
  /** As a fish in own water: invisible to enemies. */
  get submerged() {
    return this.alive && this.fish && this.inOwnInk && this.morph > 0.7;
  }
  // Access for the simulation
  _s() {
    return this;
  }
}
const prev = new THREE.Vector3();
export class Sim {
  constructor(arena, paint) {
    this.arena = arena;
    this.paint = paint;
    this.actors = [];
    this.projectiles = [];
    // Small drips falling out of the stream (see drip); they paint where they land.
    this.drips = [];
    this.events = [];
    // false on a party guest: water drops fly, but nothing is painted or hit.
    this.authority = true;
    // A list that collects every new water drop while it is not null (party host).
    this.shots = null;
    // The clock of the rules in seconds; it only runs while step() is called.
    this.time = 0;
    // Party host: where every character was in the last half second, so
    // the guest's shots can be judged against what the guest saw (poseAt).
    this.history = null;
  }
  /**
   * A water drop; on a guest it comes from the host's list (see shots).
   * Its trail of drips (see drip) runs on a straight line from the shooter's
   * feet (fromX, fromZ): in the direction lookYaw if given, else towards the
   * place where the drop will land; it ends level with that place.
   */
  addProjectile(x, y, z, vx, vy, vz, team, owner, fromX = x, fromZ = z, lookYaw = NaN) {
    const land = this.landing(x, y, z, vx, vy, vz);
    const dx = land.x - fromX;
    const dz = land.z - fromZ;
    let ux = 0;
    let uz = 0;
    let len = Math.hypot(dx, dz);
    if (Number.isFinite(lookYaw)) {
      ux = -Math.sin(lookYaw);
      uz = -Math.cos(lookYaw);
      len = Math.max(0, dx * ux + dz * uz);
    } else if (len > 0) {
      ux = dx / len;
      uz = dz / len;
    }
    this.projectiles.push({
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(vx, vy, vz),
      team,
      owner,
      life: CONFIG.weapon.maxLife,
      trail: { x: fromX, z: fromZ, ux, uz, len },
      trailAt: 0, // distance of the next drip along the trail; the first falls at the feet
      rewind: owner ? owner.rewind : 0,
    });
    if (this.shots) this.shots.push([x, y, z, vx, vy, vz, team, owner ? owner.id : -1]);
  }
  addActor(team, slot, isBot) {
    const a = new Actor(this.actors.length, team, slot, isBot);
    this.actors.push(a);
    this.respawn(a);
    a.invuln = 0;
    return a;
  }
  respawn(a) {
    const s = this.arena.spawn(a.team, a.slot);
    a.pos.set(s.x, s.y, s.z);
    a.vel.set(0, 0, 0);
    a.yaw = s.yaw;
    a.input.aimYaw = s.yaw;
    a.input.aimPitch = 0;
    a.hp = CONFIG.actor.hp;
    a.tank = CONFIG.weapon.tank;
    a.alive = true;
    a.fish = false;
    a.morph = 0;
    a.grounded = true;
    a.climbing = false;
    a.invuln = CONFIG.actor.invulnTime;
  }
  muzzle(a, out) {
    const y = a.input.aimYaw;
    return out.set(
      a.pos.x - Math.sin(y) * 0.55 + Math.cos(y) * 0.28,
      a.pos.y + 1.2,
      a.pos.z - Math.cos(y) * 0.55 - Math.sin(y) * 0.28,
    );
  }
  /** Where a drop will land if nothing is in its way (only the arena counts). */
  landing(x, y, z, vx, vy, vz) {
    const W = CONFIG.weapon;
    const h = STEP / 2; // the same small steps as updateProjectiles
    for (let t = 0; t < W.maxLife; t += h) {
      vy -= W.gravity * h;
      const nx = x + vx * h;
      const ny = y + vy * h;
      const nz = z + vz * h;
      if (!this.arena.inBounds(nx, nz) || ny <= this.arena.heightAt(nx, nz)) break;
      x = nx;
      y = ny;
      z = nz;
    }
    return { x, z };
  }
  /**
   * The angles with which a shot from `from` lands at `to`, the drop of the
   * water included (the flatter of the two arcs that get there). A point
   * that is too far away gets the angle that carries the water furthest.
   */
  static aimAngles(from, to) {
    const W = CONFIG.weapon;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dh = Math.max(Math.hypot(dx, dz), 0.001);
    const v2 = W.speed * W.speed;
    const g = W.gravity;
    const root = v2 * v2 - g * (g * dh * dh + 2 * dy * v2);
    const pitch =
      root >= 0 ? Math.atan((v2 - Math.sqrt(root)) / (g * dh)) : Math.PI / 4 + Math.atan2(dy, dh) / 2;
    return { yaw: Math.atan2(-dx, -dz), pitch };
  }
  step(dt) {
    this.time += dt;
    for (const a of this.actors) if (!a.external) this.updateActor(a, dt);
    if (this.history) this.record();
    this.updateProjectiles(dt);
  }
  // ── Looking back in time (party host) ──────────────────────
  /** Writes down where every character is now; keeps half a second. */
  record() {
    for (const a of this.actors) {
      let list = this.history.get(a);
      if (!list) this.history.set(a, (list = []));
      list.push({
        t: this.time,
        x: a.pos.x,
        y: a.pos.y,
        z: a.pos.z,
        morph: a.morph,
        open: a.alive && a.invuln <= 0, // could be hit at that moment
      });
      while (list.length > 2 && list[0].t < this.time - 0.5) list.shift();
    }
  }
  /**
   * Where character a was at the time t (between two notes), or the present
   * if nothing is written down. "open" is false if it could not be hit then.
   */
  poseAt(a, t) {
    const list = this.history && this.history.get(a);
    const now = { x: a.pos.x, y: a.pos.y, z: a.pos.z, morph: a.morph, open: true };
    if (!list || list.length === 0 || t >= list[list.length - 1].t) return now;
    if (t <= list[0].t) return list[0];
    let i = list.length - 1;
    while (list[i - 1].t > t) i--;
    const p = list[i - 1];
    const q = list[i];
    const k = (t - p.t) / (q.t - p.t || 1);
    return {
      x: p.x + (q.x - p.x) * k,
      y: p.y + (q.y - p.y) * k,
      z: p.z + (q.z - p.z) * k,
      morph: k < 0.5 ? p.morph : q.morph,
      open: p.open && q.open,
    };
  }
  // ── Characters ─────────────────────────────────────────────
  updateActor(a, dt) {
    const M = CONFIG.move;
    const W = CONFIG.weapon;
    const s = a._s();
    if (!a.alive) {
      a.respawnT -= dt;
      if (a.respawnT <= 0) this.respawn(a);
      return;
    }
    const inp = a.input;
    a.invuln = Math.max(0, a.invuln - dt);
    s.fireT -= dt;
    a.hitT += dt;
    a.fish = inp.fish;
    a.morph = Math.min(1, Math.max(0, a.morph + ((a.fish ? 1 : -1) * dt) / M.morphTime));
    // What is the character standing in right now?
    const ink = a.grounded ? this.paint.floorTeamAt(a.pos.x, a.pos.z) : 0;
    a.inOwnInk = ink === a.team || a.climbing;
    a.inEnemyInk = ink !== 0 && ink !== a.team;
    const P = a.fish ? (a.inOwnInk ? M.fishInk : M.fishDry) : M.human;
    const maxSpeed = P.maxSpeed * (a.inEnemyInk ? M.enemyInkFactor : 1);
    let mx = inp.moveX;
    let mz = inp.moveZ;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    if (a.grounded) {
      // The speed approaches the wanted speed with limited acceleration:
      // that gives a run-up, rolling out and inertia in turns.
      const dvx = mx * maxSpeed - a.vel.x;
      const dvz = mz * maxSpeed - a.vel.z;
      const d = Math.hypot(dvx, dvz);
      const rate = (len > 0.01 ? P.accel : P.decel) * dt;
      if (d <= rate) {
        a.vel.x += dvx;
        a.vel.z += dvz;
      } else {
        a.vel.x += (dvx / d) * rate;
        a.vel.z += (dvz / d) * rate;
      }
    } else if (len > 0.01) {
      // In the air: only a little control, existing momentum stays.
      const sp0 = Math.hypot(a.vel.x, a.vel.z);
      a.vel.x += mx * M.airAccel * dt;
      a.vel.z += mz * M.airAccel * dt;
      const sp1 = Math.hypot(a.vel.x, a.vel.z);
      const cap = Math.max(sp0, M.airMaxSpeed);
      if (sp1 > cap) {
        a.vel.x *= cap / sp1;
        a.vel.z *= cap / sp1;
      }
    }
    // Jumping
    s.airT = a.grounded ? 0 : s.airT + dt;
    const jumpPressed = inp.jump && !s.prevJump;
    s.prevJump = inp.jump;
    if (jumpPressed && s.canJump && s.airT < M.coyoteTime) {
      a.vel.y = P.jumpSpeed;
      if (a.fish && a.inOwnInk) {
        a.vel.x *= M.fishJumpBoost;
        a.vel.z *= M.fishJumpBoost;
      }
      a.grounded = false;
      s.canJump = false;
    }
    // Move horizontally, axis by axis, checking against walls
    const r = M.radius;
    const feet = a.pos.y;
    const lim = feet + M.stepHeight;
    a.climbing = false;
    const ar = this.arena;
    if (a.vel.x !== 0) {
      const sg = Math.sign(a.vel.x);
      const nx = a.pos.x + a.vel.x * dt;
      const px = nx + sg * r;
      const z = a.pos.z;
      const hm = Math.max(
        ar.heightAt(px, z - r * 0.7),
        ar.heightAt(px, z),
        ar.heightAt(px, z + r * 0.7),
      );
      if (hm > lim) {
        if (a.fish && this.ownWall(a, px, z, sg > 0 ? 0 : 1, z)) a.climbing = true;
        a.vel.x = 0;
      } else a.pos.x = nx;
    }
    if (a.vel.z !== 0) {
      const sg = Math.sign(a.vel.z);
      const nz = a.pos.z + a.vel.z * dt;
      const pz = nz + sg * r;
      const x = a.pos.x;
      const hm = Math.max(
        ar.heightAt(x - r * 0.7, pz),
        ar.heightAt(x, pz),
        ar.heightAt(x + r * 0.7, pz),
      );
      if (hm > lim) {
        if (a.fish && this.ownWall(a, x, pz, sg > 0 ? 2 : 3, x)) a.climbing = true;
        a.vel.z = 0;
      } else a.pos.z = nz;
    }
    // Vertical
    const wasGrounded = a.grounded;
    if (a.climbing) a.vel.y = M.climbSpeed;
    else a.vel.y -= M.gravity * dt;
    a.pos.y += a.vel.y * dt;
    const gh = ar.heightAt(a.pos.x, a.pos.z);
    if (a.pos.y <= gh) {
      a.pos.y = gh;
      if (a.vel.y < 0) a.vel.y = 0;
      a.grounded = true;
    } else if (wasGrounded && a.vel.y <= 0 && a.pos.y - gh < M.stepHeight) {
      a.pos.y = gh; // stay on the ground on ramps and small steps
      a.vel.y = 0;
      a.grounded = true;
    } else a.grounded = false;
    if (a.grounded) s.canJump = true;
    // Facing direction
    if (a.morph < 0.5) a.yaw = inp.aimYaw;
    else {
      const sp = Math.hypot(a.vel.x, a.vel.z);
      if (sp > 0.5) {
        const target = Math.atan2(-a.vel.x, -a.vel.z);
        let d = target - a.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        a.yaw += d * Math.min(1, M.fishTurnRate * dt);
      }
    }
    // Shooting and refilling
    if (!a.fish && a.morph < 0.3 && inp.shoot && s.fireT <= 0 && a.tank >= W.shotCost) {
      s.fireT = W.fireInterval;
      a.tank -= W.shotCost;
      const p = inp.aimPitch + (Math.random() - 0.5) * 2 * W.spread;
      const y = inp.aimYaw + (Math.random() - 0.5) * 2 * W.spread;
      const cp = Math.cos(p);
      this.muzzle(a, prev);
      this.addProjectile(
        prev.x,
        prev.y,
        prev.z,
        -Math.sin(y) * cp * W.speed,
        Math.sin(p) * W.speed,
        -Math.cos(y) * cp * W.speed,
        a.team,
        a,
        a.pos.x,
        a.pos.z,
        inp.lookYaw,
      );
    }
    if (a.fish && a.inOwnInk) a.tank = Math.min(W.tank, a.tank + W.refillPerSec * dt);
    if (a.hitT > CONFIG.actor.regenDelay)
      a.hp = Math.min(CONFIG.actor.hp, a.hp + CONFIG.actor.regenPerSec * dt);
  }
  /** Is the wall in front of the fish painted in its own colour? */
  ownWall(a, px, pz, face, along) {
    const shape = this.arena.shapeAt(px, pz);
    if (!shape || shape.kind !== 'box') return false;
    return this.paint.wallTeamAt(shape, face, along, a.pos.y + 0.25) === a.team;
  }
  // ── Water ──────────────────────────────────────────────────
  updateProjectiles(dt) {
    this.updateDrips(dt);
    const W = CONFIG.weapon;
    const ar = this.arena;
    const h = dt / 2;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      let dead = p.life <= 0;
      for (let sub = 0; sub < 2 && !dead; sub++) {
        prev.copy(p.pos);
        p.vel.y -= W.gravity * h;
        p.pos.addScaledVector(p.vel, h);
        if (!ar.inBounds(p.pos.x, p.pos.z)) {
          dead = true;
          break;
        }
        // Every drop drips on every screen; on a guest the drips only paint
        // early paint for its own drops (paint.js), the rest comes from the host.
        this.drip(p);
        for (const a of this.actors) {
          if (!a.alive || a.team === p.team || a.invuln > 0) continue;
          let { x, y, z } = a.pos;
          let morph = a.morph;
          if (p.rewind > 0) {
            // A party guest's drop is judged against where the target was
            // when the guest saw it (see poseAt and REWIND_MAX in config.js).
            const pose = this.poseAt(a, this.time - p.rewind);
            if (!pose.open) continue;
            ({ x, y, z, morph } = pose);
          }
          if (this.hits(p.pos, x, y, z, morph)) {
            if (this.authority) this.damage(a, p);
            dead = true;
            break;
          }
        }
        if (dead) break;
        const gh = ar.heightAt(p.pos.x, p.pos.z);
        if (p.pos.y <= gh) {
          this.impact(p, gh);
          dead = true;
          break;
        }
      }
      if (dead) {
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      }
    }
  }
  /**
   * The trail: while a drop flies, small drips fall out of it, one for
   * every dripSpacing metres. Each one lands on a straight line from the
   * shooter's feet and paints only there, when it arrives (updateDrips), so
   * colour appears only where water really comes down. The places are one
   * after the other without gaps, however high the drop flies; the higher
   * it is, the longer its drips take to fall. For a person the line runs
   * the way the camera looks, which is exactly where the fish swims with W.
   * The camera looks over the right shoulder, so the drips fall a little
   * sideways (at most about 0.9 m, at the far end), where the big splat of
   * the impact joins the trail. A drop that hits something early leaves a
   * shorter trail. Over a surface higher than the drop nothing falls.
   */
  drip(p) {
    const W = CONFIG.weapon;
    const tr = p.trail;
    const along = (p.pos.x - tr.x) * tr.ux + (p.pos.z - tr.z) * tr.uz;
    const until = Math.min(tr.len, along);
    while (p.trailAt <= until) {
      const at = p.trailAt;
      const x = tr.x + tr.ux * at;
      const z = tr.z + tr.uz * at;
      p.trailAt += W.dripSpacing;
      const gh = this.arena.heightAt(x, z);
      const h = p.pos.y - gh;
      if (h < 0) continue;
      // Falling time from height h (h = v t + g t² / 2). The first metre lies
      // under the shooter, where a falling drip cannot be seen anyway: it
      // lands at once, so a fish can start swimming right away.
      const v = W.dripFallSpeed;
      const fall = at < 1 ? 0 : (-v + Math.sqrt(v * v + 2 * W.dripGravity * h)) / W.dripGravity;
      this.drips.push({
        from: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
        x,
        z,
        t: 0,
        fall,
        team: p.team,
        pos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
      });
    }
  }
  /** Moves the falling drips; a drip that arrives paints its spot. */
  updateDrips(dt) {
    const W = CONFIG.weapon;
    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i];
      d.t += dt;
      if (d.t >= d.fall) {
        this.paint.paintDrip(d.x, d.z, W.dripRadius, d.team);
        this.drips[i] = this.drips[this.drips.length - 1];
        this.drips.pop();
        continue;
      }
      const k = d.t / d.fall;
      d.pos.set(
        d.from.x + (d.x - d.from.x) * k,
        d.from.y - W.dripFallSpeed * d.t - 0.5 * W.dripGravity * d.t * d.t,
        d.from.z + (d.z - d.from.z) * k,
      );
    }
  }
  /**
   * Does a drop at p touch a character standing at (x, y, z)? A person is a
   * capsule from 0.3 to 1.5 m above the feet with radius 0.55, a fish
   * (morph over 0.5) a ball of radius 0.5 just above the floor.
   */
  hits(p, x, y, z, morph) {
    const dx = p.x - x;
    const dz = p.z - z;
    if (morph > 0.5) {
      const dy = p.y - (y + 0.28);
      return dx * dx + dy * dy + dz * dz < 0.5 * 0.5;
    }
    const cy = Math.min(y + 1.5, Math.max(y + 0.3, p.y));
    const dy = p.y - cy;
    return dx * dx + dy * dy + dz * dz < 0.55 * 0.55;
  }
  damage(a, p) {
    a.hp -= CONFIG.weapon.damage;
    a.hitT = 0;
    this.events.push({ type: 'hit', x: p.pos.x, y: p.pos.y, z: p.pos.z, team: p.team, victim: a });
    if (a.hp <= 0) {
      a.alive = false;
      a.respawnT = CONFIG.actor.respawnTime;
      p.owner.kills++;
      const gh = this.arena.heightAt(a.pos.x, a.pos.z);
      this.paint.paintFloor(a.pos.x, a.pos.z, 2.6, p.team, gh);
      this.events.push({
        type: 'death',
        x: a.pos.x,
        y: a.pos.y + 0.8,
        z: a.pos.z,
        team: p.team,
        victim: a,
        killer: p.owner,
      });
    }
  }
  impact(p, gh) {
    const W = CONFIG.weapon;
    if (prev.y >= gh) {
      // from above onto a surface
      this.paint.paintFloor(p.pos.x, p.pos.z, W.floorRadius, p.team, gh);
      this.events.push({ type: 'splash', x: p.pos.x, y: gh, z: p.pos.z, team: p.team });
      return;
    }
    // sideways against a wall
    const s = this.arena.shapeAt(p.pos.x, p.pos.z);
    if (s && s.kind === 'box') {
      let face;
      let along;
      if (prev.x < s.x0) ((face = 0), (along = p.pos.z));
      else if (prev.x > s.x1) ((face = 1), (along = p.pos.z));
      else if (prev.z < s.z0) ((face = 2), (along = p.pos.x));
      else ((face = 3), (along = p.pos.x));
      this.paint.paintWall(s, face, along, p.pos.y, W.wallRadius, p.team);
    }
    this.paint.paintFloor(prev.x, prev.z, 0.6, p.team, this.arena.heightAt(prev.x, prev.z));
    this.events.push({ type: 'splash', x: prev.x, y: prev.y, z: prev.z, team: p.team });
  }
}
