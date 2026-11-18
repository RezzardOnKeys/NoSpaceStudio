// Teleport Snipe – short-lived things in the garden: the bright tracer line
// of every shot (from the gun to where it hit, fading out), a small flash
// where it hit, the soft column of light where a player teleported from and
// to (with a few whirling cherry petals), and the puff of petals in which a
// hit player vanishes.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const up = new THREE.Vector3(0, 1, 0);

const PETAL_COLORS = [0xf6b3c9, 0xfbd3de, 0xf08fb0];

/** A soft column texture: bright at the bottom, fading out towards the top and the sides. */
function columnTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const up = g.createLinearGradient(0, 128, 0, 0);
  up.addColorStop(0, 'rgba(255,255,255,1)');
  up.addColorStop(0.6, 'rgba(255,255,255,0.8)');
  up.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = up;
  g.fillRect(0, 0, 64, 128);
  // Softer at the left and right edge of the picture (where the column turns away).
  g.globalCompositeOperation = 'destination-in';
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.7)');
  side.addColorStop(0.5, 'rgba(0,0,0,1)');
  side.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** calm: the player asked the system for less motion (softer flashes, no whirling). */
export function createEffects(calm) {
  const group = new THREE.Group();
  const column = new THREE.CylinderGeometry(0.6, 0.8, 1, 16, 1, true);
  column.translate(0, 0.5, 0);
  const columnMap = columnTexture();
  const petal = new THREE.PlaneGeometry(0.16, 0.11);
  const live = []; // { mesh, t, life, fade(k) }
  const core = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  core.translate(0, 0.5, 0); // from one end to the other, not around the middle
  const spark = new THREE.IcosahedronGeometry(1, 0);

  function add(mesh, life, fade) {
    group.add(mesh);
    live.push({ mesh, t: 0, life, fade });
  }

  /** A line from `from` to `to` (Vector3) that glows in `color` and fades out. */
  function tracer(from, to, color) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.01) return;
    dir.divideScalar(len);
    const life = CONFIG.rifle.tracerTime;
    // Normal (not glowing) colours, so the line stays visible against the
    // bright gravel and the sky.
    for (const [radius, hex, opacity] of [
      [0.018, 0xffffff, 1], // a white core ...
      [0.06, color, 0.45], // ... in a sleeve of the shooter's colour
    ]) {
      const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false });
      const m = new THREE.Mesh(core, mat);
      m.position.copy(from);
      m.quaternion.setFromUnitVectors(up, dir);
      m.scale.set(radius, len, radius);
      add(m, life, (k) => {
        mat.opacity = opacity * (1 - k) * (1 - k);
        // The glow gets a little thinner while it fades.
        m.scale.x = m.scale.z = radius * (1 - k * 0.5);
      });
    }
  }

  /** A small bright flash where a shot ended. */
  function impact(at, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(spark, mat);
    m.position.copy(at);
    add(m, 0.25, (k) => {
      mat.opacity = 1 - k;
      m.scale.setScalar(0.08 + k * 0.25);
    });
  }

  /** A cherry petal flying along path(k) (k from 0 to 1) and fading at the end. */
  function petalAlong(life, path) {
    const mat = new THREE.MeshBasicMaterial({
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      side: THREE.DoubleSide,
      transparent: true,
    });
    const m = new THREE.Mesh(petal, mat);
    const spin = (Math.random() - 0.5) * 14;
    add(m, life, (k) => {
      path(k, m.position);
      m.rotation.set(k * spin, k * spin * 0.7, k * 3);
      mat.opacity = k < 0.8 ? 1 : (1 - k) * 5;
    });
  }

  /**
   * The flash of a teleport at the feet (x, y, z): a column of light in
   * the player's colour that fades in and out softly, with whirling petals.
   * The garden hides it like anything else (it does not shine through walls).
   */
  function flash(x, y, z, color) {
    const T = CONFIG.teleport;
    const peak = calm ? 0.6 : 0.95;
    for (const [scale, hex, strength] of [
      [1, color, 1], // the coloured column ...
      [0.45, 0xffffff, 0.9], // ... with a white heart
    ]) {
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        map: columnMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        // Only seen from outside: the player who lands inside a column is
        // not blinded by it (they see the petals around them).
        side: THREE.FrontSide,
      });
      const m = new THREE.Mesh(column, mat);
      m.position.set(x, y, z);
      m.scale.set(scale, T.flashHeight, scale);
      add(m, T.flashTime, (k) => {
        // Softly in and out: a half sine wave.
        mat.opacity = Math.sin(Math.PI * k) * peak * strength;
        m.scale.x = m.scale.z = scale * (0.8 + 0.4 * k);
      });
    }
    for (let i = 0; i < T.petals; i++) {
      const a0 = (i / T.petals) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.4;
      const rise = 1 + Math.random() * 1.8;
      const turn = calm ? 0.4 : 2.5 + Math.random() * 2;
      petalAlong(T.flashTime * 1.6, (k, out) => {
        const a = a0 + k * turn * Math.PI;
        out.set(x + Math.cos(a) * r * (1 + k * 0.5), y + 0.3 + k * rise, z + Math.sin(a) * r * (1 + k * 0.5));
      });
    }
  }

  /** A hit player vanishes in a puff of petals around (x, y, z) (the middle of the body). */
  function puff(x, y, z) {
    for (let i = 0; i < 26; i++) {
      const dx = (Math.random() - 0.5) * 2;
      const dz = (Math.random() - 0.5) * 2;
      const up = 0.6 + Math.random() * 1.6;
      const dy = (Math.random() - 0.5) * 1.2;
      petalAlong(1.1 + Math.random() * 0.6, (k, out) => {
        const e = 1 - (1 - k) * (1 - k); // fast at first, then drifting
        out.set(x + dx * e * 1.4, y + dy + up * e - k * k * 0.8, z + dz * e * 1.4);
      });
    }
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const e = live[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.life);
      e.fade(k);
      if (k >= 1) {
        group.remove(e.mesh);
        e.mesh.material.dispose();
        live.splice(i, 1);
      }
    }
  }

  return { group, tracer, impact, flash, puff, update };
}

/**
 * Cherry petals that fall slowly from every cherry tree, all the time. One
 * instanced mesh for all of them keeps it cheap; a petal that reaches the
 * ground starts again in its tree's crown. trees: [{ x, z }, ...].
 */
export function createPetalFall(trees, calm) {
  const perTree = calm ? 6 : 16;
  const count = trees.length * perTree;
  const geo = new THREE.PlaneGeometry(0.1, 0.07);
  const mat = new THREE.MeshBasicMaterial({ color: PETAL_COLORS[0], side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const color = new THREE.Color();
  const petals = [];
  const start = (p, anywhere) => {
    const t = trees[p.tree];
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 1.8;
    p.x = t.x + Math.cos(a) * r;
    p.z = t.z + Math.sin(a) * r;
    p.y = anywhere ? 0.2 + Math.random() * 4 : 3.4 + Math.random() * 1.2;
    p.fall = (calm ? 0.25 : 0.4) + Math.random() * 0.35;
    p.phase = Math.random() * 10;
  };
  for (let i = 0; i < count; i++) {
    const p = { tree: Math.floor(i / perTree) };
    start(p, true);
    petals.push(p);
    mesh.setColorAt(i, color.setHex(PETAL_COLORS[i % PETAL_COLORS.length]));
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const at = new THREE.Vector3();
  let time = 0;

  function update(dt) {
    time += dt;
    petals.forEach((p, i) => {
      p.y -= p.fall * dt;
      if (p.y < 0.03) start(p, false);
      // A light breeze: the petals sway and drift a little.
      const s = time * 0.9 + p.phase;
      at.set(p.x + Math.sin(s) * 0.35, p.y, p.z + Math.cos(s * 0.8) * 0.25);
      e.set(s * 1.7, s * 1.3, s);
      m4.compose(at, q.setFromEuler(e), one);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group: mesh, update };
}
