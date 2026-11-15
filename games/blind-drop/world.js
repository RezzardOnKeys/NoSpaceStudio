// Blind Drop – the world around the players: lights, sky, island, drifting
// rocks. It has two looks ("themes"): Classic (bright, grass) and Snipe
// (night, a stone platform painted like the view through a scope).

import * as THREE from './vendor/three.module.js';
import { ISLAND_R } from './config.js';
import { toon, flat, outlined, onGround, seeded } from './look.js';

// Everything that differs between the two looks. setTheme() applies it.
const THEMES = {
  classic: {
    skyTop: 0xffffff, skyBottom: 0x8a7bd8, skyPower: 1.5, sun: 0xffffff, sunPower: 2.4,
    top: 0x66dd52, dirt: 0xa9623a, rock: 0x8576a3,
    stars: [0xffffff, 0xfff3a6, 0x9fe8ff], starShare: 1,
  },
  snipe: {
    // Almost the same light as Classic, so the characters keep their strong
    // colours; the darkness comes from the ground and the sky.
    skyTop: 0xe9f0ff, skyBottom: 0x3a4660, skyPower: 1.4, sun: 0xf2f6ff, sunPower: 2.3,
    top: 0x2c3644, dirt: 0x1d2430, rock: 0x131821,
    stars: [0xc9dcff, 0x86a9cf, 0x6585ab], starShare: 0.45,
  },
};

/**
 * Builds the world into `scene`. `view` describes the fixed camera:
 * { dir, up } are the directions "towards the camera" and "up on screen".
 */
export function createWorld(scene, view) {
  /** A point behind the island as the camera sees it: right, up, how far away. */
  const backdrop = (right, up, depth) =>
    new THREE.Vector3(right, 0, 0).addScaledVector(view.up, up).addScaledVector(view.dir, -depth);

  // ---- Lights ----------------------------------------------------------
  const sky = new THREE.HemisphereLight(0xffffff, 0x8a7bd8, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-7, 12, 6);
  scene.add(sky, sun);

  // ---- Stars -----------------------------------------------------------
  const space = new THREE.Group();
  const starLayers = [];
  scene.add(space);
  {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath(); // a four-pointed comic sparkle
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 30 : 7;
      const a = (i / 8) * Math.PI * 2;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.fill();
    const sparkle = new THREE.CanvasTexture(c);
    const rnd = seeded(7);
    for (const [count, size] of [[700, 5], [160, 11], [90, 9]]) {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        // A flat field of stars far behind the island, facing the camera.
        const v = backdrop((rnd() - 0.5) * 420, (rnd() - 0.5) * 420, 420);
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const layer = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          map: sparkle, size, sizeAttenuation: false, transparent: true, depthWrite: false,
        }),
      );
      starLayers.push({ layer, count });
      space.add(layer);
    }
  }

  // ---- Planets (Classic) and moon (Snipe) --------------------------------
  const planetA = outlined(new THREE.Mesh(new THREE.SphereGeometry(11, 32, 20), toon(0xff8a3c)), 0.6);
  planetA.position.copy(backdrop(-52, -16, 220));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, 1.2, 8, 48), toon(0xffe08a));
  ring.rotation.x = 1.2;
  ring.scale.z = 0.3;
  planetA.add(outlined(ring, 0.4));
  const planetB = outlined(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), toon(0x57c8ff)), 0.5);
  planetB.position.copy(backdrop(54, 22, 240));

  const MOON_R = 15;
  const moon = outlined(new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 32, 20), toon(0xdfe7f3)), 0.6);
  moon.position.copy(backdrop(50, 20, 240));
  const craterMat = flat(0xb9c4d6);
  for (const [x, y, r] of [[-5, 4, 3.2], [4, -3, 2.2], [6, 6, 1.5], [-3, -7, 1.8]]) {
    // Craters sit on the side of the moon that faces the camera.
    const crater = new THREE.Mesh(new THREE.CircleGeometry(r, 20), craterMat);
    const depth = Math.sqrt(MOON_R * MOON_R - x * x - y * y) + 0.05;
    crater.position.set(x, 0, 0).addScaledVector(view.up, y).addScaledVector(view.dir, depth);
    crater.lookAt(crater.position.clone().add(view.dir));
    moon.add(crater);
  }
  scene.add(planetA, planetB, moon);

  // ---- Island ----------------------------------------------------------
  // Built at the Classic starting size; other sizes only scale this group.
  const island = new THREE.Group();
  scene.add(island);
  let islandScale = 1;
  let islandTarget = 1;
  const topMat = toon(0x66dd52);
  const dirtMat = toon(0xa9623a);
  const rockMat = toon(0x8576a3);

  const top = outlined(
    new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 0.36, 72), topMat),
    0.13,
  );
  top.position.y = -0.18;
  const dirt = outlined(
    new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R * 0.995, ISLAND_R * 0.9, 1.3, 30), dirtMat),
    0.1,
  );
  dirt.position.y = -1.0;
  island.add(top, dirt);

  // Rocky underside: an upside-down cone with dented, faceted sides.
  {
    const cone = new THREE.ConeGeometry(ISLAND_R * 0.9, 13, 14, 7);
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      // The same input gives the same dent, so the seam of the cone stays closed.
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      const dent = 0.82 + (n - Math.floor(n)) * 0.36;
      p.setXYZ(i, x * dent, y, z * dent);
    }
    cone.rotateX(Math.PI);
    // Separate corners per triangle give the hard, faceted rock look.
    const facets = cone.toNonIndexed();
    facets.computeVertexNormals();
    const rock = outlined(new THREE.Mesh(facets, rockMat), 0.14);
    rock.position.y = -8.1;
    island.add(rock);
  }

  /** Classic only: darker spots in the grass. */
  const patches = new THREE.Group();
  {
    const rnd = seeded(42);
    const patchMat = flat(0x52c943);
    for (let i = 0; i < 9; i++) {
      const patch = onGround(new THREE.CircleGeometry(0.6 + rnd() * 1.1, 24), patchMat);
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * ISLAND_R * 0.8;
      patch.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d);
      patches.add(patch);
    }
  }

  /** Snipe only: lines painted on the stone like the view through a scope. */
  const reticle = new THREE.Group();
  {
    const lineMat = flat(0x9db3c9, { transparent: true, opacity: 0.5, depthWrite: false });
    const redMat = flat(0xff3b3b, { transparent: true, opacity: 0.85, depthWrite: false });
    for (const share of [0.25, 0.5, 0.75, 0.97]) {
      const r = ISLAND_R * share;
      reticle.add(onGround(new THREE.RingGeometry(r - 0.04, r + 0.04, 96), lineMat));
    }
    for (const turn of [0, Math.PI / 2]) {
      const line = onGround(new THREE.PlaneGeometry(ISLAND_R * 1.94, 0.08), lineMat);
      line.rotation.z = turn;
      reticle.add(line);
    }
    // Small tick marks along the cross.
    for (let i = 1; i < ISLAND_R; i++) {
      for (const [x, z, turn] of [[i, 0, Math.PI / 2], [-i, 0, Math.PI / 2], [0, i, 0], [0, -i, 0]]) {
        const tick = onGround(new THREE.PlaneGeometry(i % 5 === 0 ? 0.9 : 0.45, 0.06), lineMat);
        tick.rotation.z = turn;
        tick.position.set(x, 0, z);
        reticle.add(tick);
      }
    }
    reticle.add(onGround(new THREE.CircleGeometry(0.22, 20), redMat));
    reticle.position.y = 0.025;
  }
  island.add(patches, reticle);

  // ---- Loose rocks drifting next to the island ---------------------------
  const drifters = [];
  {
    const rnd = seeded(99);
    for (let i = 0; i < 6; i++) {
      const rock = outlined(
        new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rnd() * 0.7, 0), rockMat),
        0.08,
      );
      const a = rnd() * Math.PI * 2;
      const d = ISLAND_R + 2.5 + rnd() * 5;
      rock.position.set(Math.cos(a) * d, -2 - rnd() * 6, Math.sin(a) * d);
      rock.userData = { baseY: rock.position.y, phase: rnd() * 6, spin: 0.2 + rnd() * 0.5 };
      scene.add(rock);
      drifters.push(rock);
    }
  }

  /** Switches the whole look: 'classic' or 'snipe'. */
  function setTheme(name) {
    const snipe = name === 'snipe';
    const t = snipe ? THEMES.snipe : THEMES.classic;
    sky.color.set(t.skyTop);
    sky.groundColor.set(t.skyBottom);
    sky.intensity = t.skyPower;
    sun.color.set(t.sun);
    sun.intensity = t.sunPower;
    topMat.color.set(t.top);
    dirtMat.color.set(t.dirt);
    rockMat.color.set(t.rock);
    starLayers.forEach(({ layer, count }, i) => {
      layer.material.color.set(t.stars[i]);
      layer.geometry.setDrawRange(0, Math.round(count * t.starShare));
    });
    planetA.visible = planetB.visible = !snipe;
    moon.visible = snipe;
    patches.visible = !snipe;
    reticle.visible = snipe;
  }

  /** Sets the island size; with `animate` it shrinks smoothly. */
  function setRadius(radius, animate) {
    islandTarget = radius / ISLAND_R;
    if (!animate) islandScale = islandTarget;
  }

  /** Advances the slow background motion by dt seconds. */
  function update(dt, time) {
    islandScale += (islandTarget - islandScale) * Math.min(1, dt * 4);
    island.scale.set(islandScale, 0.55 + islandScale * 0.45, islandScale);
    space.rotateOnWorldAxis(view.dir, dt * 0.004);
    planetA.rotation.y += dt * 0.05;
    for (const d of drifters) {
      d.position.y = d.userData.baseY + Math.sin(time * 0.7 + d.userData.phase) * 0.5;
      d.rotation.x += dt * d.userData.spin;
      d.rotation.y += dt * d.userData.spin * 0.7;
    }
  }

  setTheme('classic');
  return { setTheme, setRadius, update };
}
