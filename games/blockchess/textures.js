// Blockchess – pixel textures, painted while the game loads (there are no
// image files). A "painter" is a function (x, y, w, h) -> colour | null:
// null = see-through, "!#rrggbb" = a glowing pixel.
import * as THREE from './vendor/three.module.js';

export function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export const rnd = (x, y, s) => hash(x, y, s) / 4294967296;

// Colour noise from a palette (a colour named twice shows up twice as often)
export const noise = (cols, s = 1) => (x, y) => cols[hash(x, y, s) % cols.length];

export const solid = (c) => () => c;

// Pixel art from lines of text. Outside the lines the fallback painter is used.
export function art(rows, map, fallback) {
  return (x, y, w, h) => {
    const row = rows[y];
    const ch = row ? row[x] : undefined;
    if (ch === undefined) return fallback ? fallback(x, y, w, h) : null;
    const c = map[ch];
    if (c === undefined || c === null) return null;
    if (typeof c === 'function') return c(x, y, w, h);
    if (Array.isArray(c)) return c[hash(x, y, 13) % c.length];
    return c;
  };
}

// Mixes in specks of a second colour
export const speck = (base, spot, rate, s = 5, cell = 1) => (x, y, w, h) =>
  hash(Math.floor(x / cell), Math.floor(y / cell), s) % 100 < rate
    ? (typeof spot === 'function' ? spot(x, y, w, h) : spot)
    : base(x, y, w, h);

let ids = 0;
const cache = new Map();

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function tex(painter, w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (!painter.__id) painter.__id = ++ids;
  const key = `${painter.__id}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  let ecv = null, ectx = null, alpha = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = painter(x, y, w, h);
      if (!c) { alpha = true; continue; }
      const glow = c[0] === '!';
      if (glow) c = c.slice(1);
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
      if (glow) {
        if (!ecv) {
          ecv = document.createElement('canvas');
          ecv.width = w; ecv.height = h;
          ectx = ecv.getContext('2d');
          ectx.fillStyle = '#000';
          ectx.fillRect(0, 0, w, h);
        }
        ectx.fillStyle = c;
        ectx.fillRect(x, y, 1, 1);
      }
    }
  }
  const t = toTexture(cv);
  t.userData = { alpha, emissive: ecv ? toTexture(ecv) : null };
  cache.set(key, t);
  return t;
}

const matCache = new Map();
export function material(painter, w, h, opts = {}) {
  const t = tex(painter, w, h);
  const key = t.uuid + (opts.side ? 'd' : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      map: t,
      alphaTest: t.userData.alpha ? 0.5 : 0,
      side: opts.side || THREE.FrontSide,
    });
    if (t.userData.emissive) {
      m.emissiveMap = t.userData.emissive;
      m.emissive = new THREE.Color('#ffffff');
    }
    matCache.set(key, m);
  }
  return m;
}
