// Teleport Snipe – how players, keys and shots are packed for the network.
// Host and guest both use this file, so the two sides can never disagree
// about the order of the numbers. Short lists of numbers are much smaller
// than objects with names, and they are sent about 30 times per second.
// Everything that is unpacked comes from another computer, so every value
// is checked.

const num = (v) => (Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, num(v)));
const mm = (v) => Math.round(v * 1000) / 1000; // three digits after the point are plenty
// The garden is 50 x 50 m; nothing real is further out than this.
const FAR = 40;

/** Host: the state of one player as a list of numbers. */
export function packPlayer(p) {
  return [
    mm(p.x),
    mm(p.y),
    mm(p.z),
    mm(p.vx),
    mm(p.vy),
    mm(p.vz),
    mm(p.yaw),
    p.crouching ? 1 : 0,
    p.alive ? 1 : 0,
    mm(p.reload),
    p.shots,
  ];
}

/** Guest: a list made by packPlayer() as a checked object. */
export function unpackPlayer(list) {
  if (!Array.isArray(list)) return null;
  return {
    x: clamp(list[0], -FAR, FAR),
    y: clamp(list[1], -1, 20),
    z: clamp(list[2], -FAR, FAR),
    vx: clamp(list[3], -40, 40),
    vy: clamp(list[4], -40, 40),
    vz: clamp(list[5], -40, 40),
    yaw: num(list[6]),
    crouching: list[7] === 1,
    alive: list[8] !== 0,
    reload: clamp(list[9], 0, 5),
    shots: Math.round(clamp(list[10], 0, 1e6)),
  };
}

/**
 * Guest: the keys of one step of the rules as whole numbers (the view
 * direction in thousandths of a radian). The guest moves its own player
 * with exactly these rounded values, so host and guest work with the same
 * numbers. Flags: 1 jump, 2 crouch, 4 zoom.
 */
export function packInput(inp) {
  return [inp.f, inp.s, Math.round(inp.yaw * 1000), (inp.jump ? 1 : 0) | (inp.crouch ? 2 : 0) | (inp.zoom ? 4 : 0)];
}

/** Writes a list made by packInput() into a player's input. */
export function unpackInput(inp, list) {
  if (!Array.isArray(list)) return;
  inp.f = Math.round(clamp(list[0], -1, 1));
  inp.s = Math.round(clamp(list[1], -1, 1));
  inp.yaw = num(list[2]) / 1000;
  const flags = Math.round(num(list[3]));
  inp.jump = (flags & 1) !== 0;
  inp.crouch = (flags & 2) !== 0;
  inp.zoom = (flags & 4) !== 0;
}

/**
 * Host: a shot of the guest from its message, checked. The direction is
 * made length 1 again (a broken one gives null).
 */
export function unpackShot(msg) {
  const dx = num(msg.dx);
  const dy = num(msg.dy);
  const dz = num(msg.dz);
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.5 || len > 1.5) return null;
  return {
    ox: clamp(msg.ox, -FAR, FAR),
    oy: clamp(msg.oy, -1, 20),
    oz: clamp(msg.oz, -FAR, FAR),
    dx: dx / len,
    dy: dy / len,
    dz: dz / len,
  };
}

/** A point { x, y, z } as a short list, and back (checked). */
export const packPoint = (p) => [mm(p.x), mm(p.y), mm(p.z)];
export const unpackPoint = (list) =>
  Array.isArray(list) ? { x: clamp(list[0], -200, 200), y: clamp(list[1], -50, 200), z: clamp(list[2], -200, 200) } : null;
