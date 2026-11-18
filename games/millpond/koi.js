// Millpond – the koi and the ripples: a handful of orange, white and
// red-and-white fish that swim slowly in curves through the pond, just under
// the surface. Each fish heads for a point a little further round the pond;
// when it gets close it picks the next one. A soft push keeps it away from
// the island, the shore and the water mill's wheel, so a fish never swims
// through anything. When something falls into the water, rings spread from
// there, a few drops jump up, and the nearest koi swim over to look.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const W = CONFIG.world;
const K = CONFIG.koi;
const MILL = { x: Math.cos(W.mill.angle) * W.pondRadius, z: Math.sin(W.mill.angle) * W.pondRadius };

/** The skin patterns: base colour, patch colour, how much of the body the patches cover. */
const SKINS = [
  ['#f26b1d', '#ffffff', 0.15], // orange with a little white
  ['#f7f3ea', '#e8442a', 0.45], // white with red patches
  ['#f7f3ea', '#f28a2a', 0.25], // white with orange spots
  ['#e8442a', '#f7f3ea', 0.35], // red with white
  ['#ffb347', '#f7f3ea', 0.2], // golden
];

/** A new target for a fish: a bit further round the pond, in its own direction. */
function nextTarget(f, rnd) {
  const a = Math.atan2(f.z, f.x) + f.dir * (K.targetStep[0] + rnd() * (K.targetStep[1] - K.targetStep[0]));
  const r = K.inner + 1 + rnd() * (K.outer - K.inner - 2);
  f.tx = Math.cos(a) * r;
  f.tz = Math.sin(a) * r;
  // Now and then a fish turns round and swims the other way.
  if (rnd() < 0.12) f.dir = -f.dir;
}

/**
 * Moves one fish on by dt seconds (changes f). f: { x, z, heading, speed,
 * dir, tx, tz }. Used by the picture and by the test scripts.
 */
export function stepFish(f, dt, rnd) {
  if (Math.hypot(f.tx - f.x, f.tz - f.z) < 1.5) nextTarget(f, rnd);
  let dx = f.tx - f.x;
  let dz = f.tz - f.z;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  // Pushes away from the island, the shore and the mill wheel.
  const r = Math.hypot(f.x, f.z) || 1;
  const rx = f.x / r;
  const rz = f.z / r;
  if (r < K.inner + 1.5) {
    const k = (K.inner + 1.5 - r) * 1.5;
    dx += rx * k;
    dz += rz * k;
    // ... and round it, in the fish's own direction, instead of straight back.
    dx += -rz * f.dir * k;
    dz += rx * f.dir * k;
  }
  if (r > K.outer - 1) {
    const k = (r - (K.outer - 1)) * 1.5;
    dx -= rx * k;
    dz -= rz * k;
  }
  const mx = f.x - MILL.x;
  const mz = f.z - MILL.z;
  const md = Math.hypot(mx, mz) || 1;
  if (md < K.millRoom) {
    dx += (mx / md) * (K.millRoom - md) * 3;
    dz += (mz / md) * (K.millRoom - md) * 3;
  }
  // Turn towards that direction, but only so fast.
  const want = Math.atan2(dx, dz);
  let turn = want - f.heading;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  const maxTurn = K.turnRate * dt;
  f.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
  f.x += Math.sin(f.heading) * f.speed * dt;
  f.z += Math.cos(f.heading) * f.speed * dt;
}

/** A new fish at a random place in the pond. */
export function newFish(rnd) {
  const a = rnd() * Math.PI * 2;
  const r = K.inner + 2 + rnd() * (K.outer - K.inner - 4);
  const f = {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    heading: rnd() * Math.PI * 2,
    speed: K.speed[0] + rnd() * (K.speed[1] - K.speed[0]),
    dir: rnd() < 0.5 ? -1 : 1,
    tx: 0,
    tz: 0,
  };
  nextTarget(f, rnd);
  return f;
}

/** The body of a fish with its skin painted on its corners (head at +z). */
function fishBody(skin, rnd) {
  const geo = new THREE.SphereGeometry(1, 10, 6).toNonIndexed();
  geo.scale(0.17, 0.11, 0.5);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const base = new THREE.Color(skin[0]);
  const patch = new THREE.Color(skin[1]);
  const a = rnd() * 10;
  const b = rnd() * 10;
  for (let tri = 0; tri < pos.count; tri += 3) {
    // One colour per triangle, so the patches have clean low-poly edges.
    const z = (pos.getZ(tri) + pos.getZ(tri + 1) + pos.getZ(tri + 2)) / 3;
    const x = (pos.getX(tri) + pos.getX(tri + 1) + pos.getX(tri + 2)) / 3;
    const n = Math.sin(z * 11 + a) * Math.cos(x * 17 + b);
    const c = n > 1 - skin[2] * 2 ? patch : base;
    for (let k = 0; k < 3; k++) c.toArray(colours, (tri + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A flat fin: a triangle lying in the x-z plane, pointing backwards (-z). */
function finGeo(w, l) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, 0, -l], 3));
  geo.computeVertexNormals();
  return geo;
}

export function createKoi(scene, calm) {
  let seed = 1234;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // The fish are drawn after the water and let a little of it through, so
  // they look just under the surface but keep their bright colours.
  const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true, emissive: '#3a1a08', transparent: true, opacity: 0.85 });
  const finMat = new THREE.MeshStandardMaterial({ color: '#ffe2c6', roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const tailGeo = finGeo(0.34, 0.32);
  tailGeo.rotateZ(Math.PI / 2); // the tail stands upright
  const sideFin = finGeo(0.14, 0.16);

  const fish = [];
  for (let i = 0; i < K.count; i++) {
    const skin = SKINS[i % SKINS.length];
    const group = new THREE.Group();
    const body = new THREE.Mesh(fishBody(skin, rnd), skinMat);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({ color: skin[0], roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    tail.position.z = -0.45;
    const left = new THREE.Mesh(sideFin, finMat);
    left.position.set(0.15, -0.03, 0.15);
    left.rotation.y = 0.9;
    const right = new THREE.Mesh(sideFin, finMat);
    right.position.set(-0.15, -0.03, 0.15);
    right.rotation.y = -0.9;
    group.add(body, tail, left, right);
    for (const part of group.children) part.renderOrder = 2;
    const s = 1.2 + rnd() * 0.5;
    group.scale.setScalar(s);
    scene.add(group);
    fish.push({ ...newFish(rnd), group, tail, phase: rnd() * 6.3 });
  }

  // Rings on the water and drops of a splash, made once and used again.
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(0.9, 1, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = [];
  const dropGeo = new THREE.IcosahedronGeometry(0.05, 0);
  const dropMat = new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.85 });
  const drops = [];

  function ripple(x, z, delay = 0) {
    let r = rings.find((ring) => !ring.mesh.visible);
    if (!r) {
      r = { mesh: new THREE.Mesh(ringGeo, ringMat.clone()), t: 0, delay: 0 };
      scene.add(r.mesh);
      rings.push(r);
    }
    r.mesh.position.set(x, W.waterY + 0.04, z);
    r.mesh.visible = true;
    r.mesh.scale.setScalar(0.01);
    r.t = 0;
    r.delay = delay;
  }

  return {
    /** Rings spread from this spot on the water. */
    ripple,

    /** Something fell into the water here: rings and a few drops. */
    splash(x, z) {
      ripple(x, z);
      ripple(x, z, 0.35);
      if (calm) return;
      for (let i = 0; i < 8; i++) {
        let d = drops.find((drop) => !drop.mesh.visible);
        if (!d) {
          d = { mesh: new THREE.Mesh(dropGeo, dropMat), v: new THREE.Vector3() };
          scene.add(d.mesh);
          drops.push(d);
        }
        const a = (i / 8) * Math.PI * 2 + rnd();
        d.mesh.position.set(x, W.waterY + 0.05, z);
        d.v.set(Math.cos(a) * (0.6 + rnd()), 1.8 + rnd() * 1.2, Math.sin(a) * (0.6 + rnd()));
        d.mesh.visible = true;
      }
    },

    /** The nearest koi swim over to this spot to look. */
    attract(x, z, count = K.curious) {
      // The spot they swim to stays inside the part of the pond they may use.
      const r = Math.hypot(x, z) || 1;
      const to = Math.max(K.inner + 1, Math.min(K.outer - 1, r));
      const tx = (x / r) * to;
      const tz = (z / r) * to;
      const near = fish.slice().sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz));
      for (const f of near.slice(0, count)) {
        f.tx = tx + (rnd() - 0.5);
        f.tz = tz + (rnd() - 0.5);
      }
    },

    update(t, dt) {
      for (const r of rings) {
        if (!r.mesh.visible) continue;
        if (r.delay > 0) {
          r.delay -= dt;
          r.mesh.material.opacity = 0;
          continue;
        }
        r.t += dt;
        const k = r.t / K.rippleTime;
        r.mesh.scale.setScalar(0.2 + k * K.rippleSize);
        r.mesh.material.opacity = 0.6 * (1 - k);
        if (k >= 1) r.mesh.visible = false;
      }
      for (const d of drops) {
        if (!d.mesh.visible) continue;
        d.v.y -= 9.8 * dt;
        d.mesh.position.addScaledVector(d.v, dt);
        if (d.mesh.position.y < W.waterY) d.mesh.visible = false;
      }
      for (const f of fish) {
        stepFish(f, calm ? dt * 0.6 : dt, rnd);
        f.group.position.set(f.x, W.waterY - K.depth + Math.sin(t * 0.7 + f.phase) * 0.04, f.z);
        // The tail swings, and the body sways a little with it.
        const swing = Math.sin(t * (calm ? 3 : 5) * (0.6 + f.speed) + f.phase);
        f.group.rotation.y = f.heading + swing * 0.06;
        f.tail.rotation.y = swing * 0.45;
      }
    },
  };
}
