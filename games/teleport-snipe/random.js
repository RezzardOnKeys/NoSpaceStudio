// Teleport Snipe – random numbers that come out the same on every screen.
// Host and guest share one number per match (the seed). The teleport spot
// of a player's n-th shot is worked out from the seed, the seat and n, so
// the shooter can teleport at once on their own screen and the host lands
// them on exactly the same spot.

/** A new seed for a match (a whole number from 1 to about 2 billion). */
export function newSeed() {
  return 1 + Math.floor(Math.random() * 2147483000);
}

/** Mixes several whole numbers into one 32-bit number (the same input gives the same output). */
export function mix(...numbers) {
  let h = 0x9e3779b9;
  for (const n of numbers) {
    h = Math.imul(h ^ (n | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** A row of random numbers from 0 to 1 that starts at `seed` (the "mulberry32" recipe). */
export function randomRow(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
