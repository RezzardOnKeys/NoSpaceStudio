// Teleport Snipe – short-lived things in the garden: the bright tracer line
// of every shot (from the gun to where it hit, fading out) and a small
// flash where it hit. The teleport flashes and the petals are added in
// later steps of the plan.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const up = new THREE.Vector3(0, 1, 0);

export function createEffects() {
  const group = new THREE.Group();
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

  return { group, tracer, impact, update };
}
