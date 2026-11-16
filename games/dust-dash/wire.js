// Dust Dash – how players, inputs, the delivery and lists of dirt are packed
// for the network. Host and guest both use this file, so the two sides can
// never disagree about the order of the numbers. Short lists of numbers are
// much smaller than objects with names, and they are sent about 30 times
// per second.

const num = (v) => (Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, num(v)));
const mm = (v) => Math.round(v * 1000) / 1000; // three digits after the point are plenty

/** Host: the state of one player as a list of numbers. */
export function packPlayer(p) {
  return [mm(p.x), mm(p.z), mm(p.vx), mm(p.vz), mm(p.yaw), p.vacuuming ? 1 : 0, p.score, p.power, mm(p.powerT)];
}

/**
 * Guest: takes over what only the host decides (score, power-up). For the
 * other player (own = false) also speed, view direction and vacuuming; the
 * position of every player is handled in guest.js (it is smoothed).
 */
export function unpackPlayer(p, list, own) {
  p.score = Math.max(0, Math.round(num(list[6])));
  p.power = Math.round(clamp(list[7], -1, 3));
  p.powerT = clamp(list[8], 0, 60);
  if (own) return;
  p.vx = clamp(list[2], -30, 30);
  p.vz = clamp(list[3], -30, 30);
  p.yaw = num(list[4]);
  p.vacuuming = list[5] === 1;
}

/**
 * Guest: the keys of one step of the rules as whole numbers (the view
 * direction in thousandths of a radian). The guest moves its own character
 * with exactly these rounded values, so host and guest work with the same
 * numbers.
 */
export function packInput(inp) {
  return [inp.f, inp.s, Math.round(inp.yaw * 1000), inp.vac ? 1 : 0];
}

/**
 * Writes a list made by packInput() into an input object. Every value is
 * checked, because on the host it comes from another computer.
 */
export function unpackInput(inp, list) {
  if (!Array.isArray(list)) return;
  inp.f = Math.round(clamp(list[0], -1, 1));
  inp.s = Math.round(clamp(list[1], -1, 1));
  inp.yaw = num(list[2]) / 1000;
  inp.vac = list[3] === 1;
}

const STATES = ['timer', 'falling', 'waiting'];

/** Host: the delivery box as a list of numbers. */
export function packDelivery(d) {
  return [STATES.indexOf(d.state), mm(d.t), mm(d.x), mm(d.z), mm(d.fall)];
}

/** Guest: writes a list made by packDelivery() into the delivery. */
export function unpackDelivery(d, list) {
  if (!Array.isArray(list)) return;
  d.state = STATES[list[0]] || 'timer';
  d.t = clamp(list[1], 0, 600);
  d.x = clamp(list[2], -100, 100);
  d.z = clamp(list[3], -100, 100);
  d.fall = clamp(list[4], 0, 1);
}

/**
 * A list of piece numbers, packed small: sorted, and then only the step
 * from one number to the next (small numbers take fewer bytes than big ones).
 */
export function packIds(ids) {
  const sorted = [...ids].sort((a, b) => a - b);
  let last = 0;
  return sorted.map((id) => {
    const step = id - last;
    last = id;
    return step;
  });
}

/** The piece numbers of a list made by packIds(); count = how many pieces exist. */
export function unpackIds(steps, count) {
  const ids = [];
  if (!Array.isArray(steps)) return ids;
  let id = 0;
  for (const step of steps) {
    if (!Number.isInteger(step) || step < 0) break;
    id += step;
    if (id >= count) break;
    ids.push(id);
  }
  return ids;
}
