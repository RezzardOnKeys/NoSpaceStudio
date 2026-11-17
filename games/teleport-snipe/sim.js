// Teleport Snipe – the rules. For now: how a player moves through the
// garden (running, jumping, crouching, sliding, stairs) and bumps into the
// boxes of map.js. Shots, hits, teleports and rounds are added in the next
// steps of the plan. This file has no drawing and no network in it: the
// referee (host.js) and the guest's copy (guest.js) both use it, so a
// player moves the same way on every screen.
//
// A player's body is a square column (radius = half its width) standing
// on its feet at (x, y, z). The view direction is the yaw: 0 looks
// towards -z, a positive yaw turns to the left.

import { CONFIG } from './config.js';
import { BOXES } from './map.js';

const EPS = 0.001;
// A fast player moves in several small pieces per step, so it can never
// pass through a thin floor or railing.
const MAX_MOVE = 0.15;

/** A new player for a seat; its keys are written into `input` every step. */
export function createPlayer(seat) {
  return {
    seat,
    x: 0,
    y: 0,
    z: 0,
    px: 0, // where the player was one step ago (for smooth pictures)
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    crouching: false,
    slideT: 0, // seconds of slide left
    slideCool: 0, // seconds until the next slide is possible
    jumpWas: false, // the jump key was held in the step before
    crouchWas: false,
    // f: forward (1) / back (-1), s: right (1) / left (-1), yaw: view
    // direction, jump and crouch: keys held.
    input: { f: 0, s: 0, yaw: 0, jump: false, crouch: false },
  };
}

/** Puts a player on a spot, standing still. */
export function placePlayer(p, spot) {
  p.x = p.px = spot.x;
  p.z = p.pz = spot.z;
  p.y = p.py = spot.y || 0;
  p.vx = p.vy = p.vz = 0;
  p.yaw = p.input.yaw = spot.yaw;
  p.grounded = true;
  p.crouching = false;
  p.slideT = 0;
  p.slideCool = 0;
}

export const bodyHeight = (p) => (p.crouching ? CONFIG.move.crouchHeight : CONFIG.move.height);

// ── Collision helpers ─────────────────────────────────────────────────

function overlapsXZ(b, x, z, r) {
  return x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1;
}

/** Does a body at this spot overlap any box? */
export function blocked(x, y, z, height, r = CONFIG.move.radius) {
  for (const b of BOXES) {
    if (b.y1 > y + EPS && b.y0 < y + height - EPS && overlapsXZ(b, x, z, r)) return true;
  }
  return false;
}

/** The highest floor (box top or the ground) between `low` and `high` under the body, or null. */
function floorBetween(x, z, low, high, r) {
  let best = low <= 0 && high >= 0 ? 0 : null;
  for (const b of BOXES) {
    if (b.y1 >= low - EPS && b.y1 <= high + EPS && overlapsXZ(b, x, z, r) && (best === null || b.y1 > best)) {
      best = b.y1;
    }
  }
  return best;
}

/** The lowest ceiling (box bottom) between `low` and `high` above the body, or null. */
function ceilingBetween(x, z, low, high, r) {
  let best = null;
  for (const b of BOXES) {
    if (b.y0 >= low - EPS && b.y0 <= high + EPS && overlapsXZ(b, x, z, r) && (best === null || b.y0 < best)) {
      best = b.y0;
    }
  }
  return best;
}

/**
 * Moves the body by d along one axis ('x' or 'z'). A box that is low
 * enough is stepped onto (only on the ground); any other box stops the
 * body at its side.
 */
function moveAxis(p, axis, d, height) {
  if (d === 0) return;
  const M = CONFIG.move;
  const r = M.radius;
  const nx = axis === 'x' ? p.x + d : p.x;
  const nz = axis === 'z' ? p.z + d : p.z;
  let stop = null; // the furthest the body may go
  let stepTop = p.y;
  for (const b of BOXES) {
    if (!(b.y1 > p.y + EPS && b.y0 < p.y + height - EPS && overlapsXZ(b, nx, nz, r))) continue;
    if (p.grounded && b.y1 - p.y <= M.stepUp) {
      stepTop = Math.max(stepTop, b.y1);
      continue;
    }
    const edge = d > 0 ? (axis === 'x' ? b.x0 : b.z0) - r - EPS : (axis === 'x' ? b.x1 : b.z1) + r + EPS;
    stop = stop === null ? edge : d > 0 ? Math.min(stop, edge) : Math.max(stop, edge);
  }
  // A step up only works if there is room for the body on top of it.
  if (stop === null && stepTop > p.y) {
    if (blocked(nx, stepTop, nz, height)) {
      stop = axis === 'x' ? p.x : p.z;
    } else {
      p.y = stepTop;
    }
  }
  const from = axis === 'x' ? p.x : p.z;
  let to = from + d;
  // Never pulled backwards (if the body was already touching a box).
  if (stop !== null) to = d > 0 ? Math.max(from, Math.min(to, stop)) : Math.min(from, Math.max(to, stop));
  if (axis === 'x') {
    p.x = to;
    if (stop !== null) p.vx = 0;
  } else {
    p.z = to;
    if (stop !== null) p.vz = 0;
  }
}

/** Moves the body up or down by its vertical speed; lands on floors, bumps against ceilings. */
function moveVertical(p, dt, height) {
  const r = CONFIG.move.radius;
  const ny = p.y + p.vy * dt;
  if (p.vy > 0) {
    const ceil = ceilingBetween(p.x, p.z, p.y + height, ny + height, r);
    if (ceil !== null) {
      p.y = ceil - height;
      p.vy = 0;
    } else {
      p.y = ny;
    }
    return;
  }
  const floor = floorBetween(p.x, p.z, ny, p.y, r);
  if (floor !== null) {
    p.y = floor;
    p.vy = 0;
    p.grounded = true;
  } else {
    p.y = ny;
  }
}

// ── One step of movement ──────────────────────────────────────────────

/** Moves the speed (vx, vz) towards (tx, tz) by at most `amount`. */
function approach(p, tx, tz, amount) {
  const dx = tx - p.vx;
  const dz = tz - p.vz;
  const len = Math.hypot(dx, dz);
  if (len <= amount) {
    p.vx = tx;
    p.vz = tz;
  } else {
    p.vx += (dx / len) * amount;
    p.vz += (dz / len) * amount;
  }
}

/** Moves one player by one step of the rules (dt seconds) using p.input. */
export function movePlayer(p, dt) {
  const M = CONFIG.move;
  const S = CONFIG.slide;
  const inp = p.input;
  p.px = p.x;
  p.py = p.y;
  p.pz = p.z;
  p.yaw = inp.yaw;
  p.slideCool = Math.max(0, p.slideCool - dt);

  // Crouching: down at once, up only where there is room for the whole body.
  if (inp.crouch) p.crouching = true;
  else if (p.crouching && !blocked(p.x, p.y, p.z, M.height)) p.crouching = false;

  // The direction the keys point to, on the ground plane.
  const fx = -Math.sin(p.yaw);
  const fz = -Math.cos(p.yaw);
  let wx = fx * inp.f + Math.cos(p.yaw) * inp.s;
  let wz = fz * inp.f - Math.sin(p.yaw) * inp.s;
  const wlen = Math.hypot(wx, wz);
  if (wlen > 1) {
    wx /= wlen;
    wz /= wlen;
  }
  const wishing = wlen > 0.01;
  const speed = Math.hypot(p.vx, p.vz);

  // A slide starts when crouch is pressed while running on the ground.
  if (inp.crouch && !p.crouchWas && p.grounded && p.slideCool <= 0 && speed >= S.minSpeed) {
    p.slideT = S.time;
    p.slideCool = S.cooldown + S.time;
    p.vx = (p.vx / speed) * S.startSpeed;
    p.vz = (p.vz / speed) * S.startSpeed;
  }
  p.crouchWas = inp.crouch;
  if (!inp.crouch || !p.grounded) p.slideT = 0;

  if (p.slideT > 0) {
    // Sliding: the speed stays high at first and drops towards the end.
    p.slideT = Math.max(0, p.slideT - dt);
    const k = 1 - p.slideT / S.time;
    const target = S.endSpeed + (S.startSpeed - S.endSpeed) * (1 - k * k);
    const now = Math.hypot(p.vx, p.vz) || 1;
    let dx = p.vx / now;
    let dz = p.vz / now;
    if (wishing) {
      // The keys bend the slide a little.
      const turn = Math.max(-1, Math.min(1, dx * wz - dz * wx)) * S.steer * dt;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      [dx, dz] = [dx * c - dz * s, dx * s + dz * c];
    }
    p.vx = dx * target;
    p.vz = dz * target;
  } else if (p.grounded) {
    const max = p.crouching ? M.crouchSpeed : M.runSpeed;
    approach(p, wx * max, wz * max, (wishing ? M.accel : M.decel) * dt);
  } else if (wishing) {
    // In the air the keys steer strongly, but never slow down a fast jump.
    const max = Math.max(p.crouching ? M.crouchSpeed : M.runSpeed, speed);
    approach(p, wx * max, wz * max, M.airAccel * dt);
  }

  // Jumping: only from the ground, once per key press.
  if (inp.jump && !p.jumpWas && p.grounded) {
    // The extra half step of gravity makes the jump reach its full height
    // although the rules move in steps.
    p.vy = Math.sqrt(2 * M.gravity * M.jumpHeight) + (M.gravity * dt) / 2;
    p.grounded = false;
    p.slideT = 0;
  }
  p.jumpWas = inp.jump;

  // Walking off an edge: on the ground the feet follow steps down.
  const height = bodyHeight(p);
  if (p.grounded && p.vy <= 0) {
    const floor = floorBetween(p.x, p.z, p.y - M.stepDown, p.y, M.radius);
    if (floor === null) p.grounded = false;
    else p.y = floor;
  }
  if (!p.grounded) p.vy = Math.max(-M.maxFall, p.vy - M.gravity * dt);

  const pieces = Math.max(1, Math.ceil((Math.max(Math.abs(p.vx), Math.abs(p.vz), Math.abs(p.vy)) * dt) / MAX_MOVE));
  const h = dt / pieces;
  for (let i = 0; i < pieces; i++) {
    moveAxis(p, 'x', p.vx * h, height);
    moveAxis(p, 'z', p.vz * h, height);
    if (!p.grounded) moveVertical(p, h, height);
    else {
      // Stepped off something while moving: let the next step find the floor.
      const floor = floorBetween(p.x, p.z, p.y - M.stepDown, p.y, M.radius);
      if (floor === null) p.grounded = false;
      else p.y = floor;
    }
  }
}
