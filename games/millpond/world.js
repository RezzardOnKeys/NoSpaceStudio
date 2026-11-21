// Millpond – the world around the board: the grassy island with flowers,
// mushrooms and four little stone lanterns, the pond with soft waves, light spots, water lilies, reeds and
// stones, the water mill with its turning wheel, and the land beyond with
// trees, soft hills, a warm sky and drifting clouds. At dusk the sky turns
// orange and blue, the lanterns glow and fireflies float over the water
// (setDusk). Everything is made of
// simple low-poly shapes; things that come many times (reeds, flowers,
// stones, trees ...) are drawn as one instanced mesh each, so the graphics
// chip has little to do.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const W = CONFIG.world;
/** Where the water mill stands: on the shore of the pond. */
const MILL = { x: Math.cos(W.mill.angle) * W.pondRadius, z: Math.sin(W.mill.angle) * W.pondRadius };

/** A random number generator with a fixed seed, so every player sees the same pond. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });

/** Moves the corners of a low-poly shape a little, so it looks hand-made. Corners at the same place move alike. */
function roughen(geo, amount, rnd, keepFlatTop = null) {
  const pos = geo.attributes.position;
  const moved = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, [(rnd() - 0.5) * amount, (rnd() - 0.5) * amount, (rnd() - 0.5) * amount]);
    const [dx, dy, dz] = moved.get(key);
    pos.setX(i, pos.getX(i) + dx);
    if (keepFlatTop === null || Math.abs(pos.getY(i) - keepFlatTop) > 0.001) pos.setY(i, pos.getY(i) + dy);
    pos.setZ(i, pos.getZ(i) + dz);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * One instanced mesh: `place(i)` returns { x, y, z, s (scale or [sx, sy, sz]),
 * ry (turn), rx, rz, color } for every copy i.
 */
function instances(geo, material, count, place, { shadow = false } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const p = place(i);
    const s = Array.isArray(p.s) ? p.s : [p.s ?? 1, p.s ?? 1, p.s ?? 1];
    q.setFromEuler(e.set(p.rx || 0, p.ry || 0, p.rz || 0));
    m.compose(v.set(p.x, p.y, p.z), q, sc.set(s[0], s[1], s[2]));
    mesh.setMatrixAt(i, m);
    if (p.color) mesh.setColorAt(i, c.set(p.color));
  }
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

/** A point on the ring between radius r0 and r1, at a random angle. */
function onRing(rnd, r0, r1) {
  const a = rnd() * Math.PI * 2;
  const r = r0 + rnd() * (r1 - r0);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, a, r };
}

/** Where the four stone lanterns stand on the island: on the diagonals, outside the board. */
const LANTERNS = [1, 3, 5, 7].map((k) => {
  const a = (k * Math.PI) / 4;
  return { x: Math.cos(a) * W.lanterns.radius, z: Math.sin(a) * W.lanterns.radius };
});

/** Is this spot beside the water mill (kept free of trees and reeds)? */
const nearMill = (x, z, room) => Math.hypot(x - MILL.x, z - MILL.z) < room;

// ---------------------------------------------------------------------------

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(260, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(W.sky.top) },
      horizon: { value: new THREE.Color(W.sky.horizon) },
    },
    vertexShader: `varying float h;
      void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying float h;
      void main() { gl_FragColor = vec4(mix(horizon, top, smoothstep(-0.05, 0.45, h)), 1.0); }`,
  });
  scene.add(new THREE.Mesh(geo, material));
  const sky = material.uniforms;

  // Clouds: a few soft clusters of white balls that drift slowly round the sky.
  const rnd = seeded(91);
  const clouds = new THREE.Group();
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const white = mat('#ffffff', { emissive: '#fff3e6', emissiveIntensity: 0.35 });
  const parts = [];
  for (let c = 0; c < 9; c++) {
    const a = rnd() * Math.PI * 2;
    const r = 80 + rnd() * 60;
    const y = 32 + rnd() * 22;
    const n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const s = 3 + rnd() * 4;
      parts.push({
        x: Math.cos(a) * r + (i - n / 2) * 4.2 + rnd() * 2,
        y: y + rnd() * 2,
        z: Math.sin(a) * r + (rnd() - 0.5) * 5,
        s: [s * 1.3, s * 0.7, s],
      });
    }
  }
  clouds.add(instances(puff, white, parts.length, (i) => parts[i]));
  scene.add(clouds);
  return { clouds, sky, cloudMat: white };
}

function buildLand(scene) {
  const rnd = seeded(7);
  // The flat meadow round the pond, with a bank sloping down into the water.
  const meadow = new THREE.Mesh(new THREE.RingGeometry(W.pondRadius, 240, 96, 1), mat('#86b85c'));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = W.landY;
  meadow.receiveShadow = true;
  const bank = new THREE.Mesh(
    roughen(new THREE.CylinderGeometry(W.pondRadius, W.pondRadius - 1.6, W.landY - W.floorY, 64, 1, true), 0.4, rnd),
    mat('#8a7048', { side: THREE.DoubleSide }),
  );
  bank.position.y = (W.landY + W.floorY) / 2;
  scene.add(meadow, bank);

  // Soft hills further out, in a few shades of green.
  const hillGreens = ['#7aa852', '#6d9c4a', '#88b65e', '#5f8f42', '#94bf68'];
  const hills = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
    const r = 70 + rnd() * 50;
    const s = 16 + rnd() * 20;
    hills.push({ x: Math.cos(a) * r, y: W.landY - 2, z: Math.sin(a) * r, s: [s * 1.4, 5 + rnd() * 12, s], ry: rnd() * 6, color: hillGreens[i % 5] });
  }
  scene.add(instances(roughen(new THREE.IcosahedronGeometry(1, 1), 0.15, rnd), mat('#ffffff'), hills.length, (i) => hills[i]));

  // Trees round the pond: pines and round leafy trees.
  const pines = [];
  const leafy = [];
  while (pines.length + leafy.length < 70) {
    const p = onRing(rnd, W.pondRadius + 3, 58);
    if (nearMill(p.x, p.z, 9)) continue;
    const s = 0.8 + rnd() * 0.7;
    (rnd() < 0.5 ? pines : leafy).push({ x: p.x, z: p.z, s });
  }
  const trunk = new THREE.CylinderGeometry(0.22, 0.3, 1, 6);
  const trunks = [...pines, ...leafy];
  scene.add(
    instances(trunk, mat('#6b4a2e'), trunks.length, (i) => ({ x: trunks[i].x, y: W.landY + 0.9 * trunks[i].s, z: trunks[i].z, s: [trunks[i].s, 1.8 * trunks[i].s, trunks[i].s] })),
  );
  const cone = new THREE.ConeGeometry(1.6, 3, 7);
  const pineGreens = ['#3f7a3c', '#4a8642', '#356d35'];
  scene.add(
    instances(cone, mat('#ffffff'), pines.length * 2, (i) => {
      const t = pines[i >> 1];
      const tier = i & 1;
      return { x: t.x, y: W.landY + (2.6 + tier * 1.6) * t.s, z: t.z, s: t.s * (1 - tier * 0.3), ry: i, color: pineGreens[i % 3] };
    }),
  );
  const ball = roughen(new THREE.IcosahedronGeometry(1.7, 0), 0.4, rnd);
  const leafGreens = ['#6aa845', '#7cb850', '#5c9a3c', '#8fc25a'];
  scene.add(
    instances(ball, mat('#ffffff'), leafy.length, (i) => ({
      x: leafy[i].x,
      y: W.landY + 3.4 * leafy[i].s,
      z: leafy[i].z,
      s: leafy[i].s,
      ry: i,
      color: leafGreens[i % 4],
    })),
  );
}

/** A water lily flower: two rings of pointed petals that open upwards, as one shape. */
function flowerGeo() {
  const parts = [];
  for (const [n, tilt, len, turn] of [
    [8, 0.95, 0.26, 0],
    [6, 0.45, 0.2, 0.4],
  ]) {
    for (let i = 0; i < n; i++) {
      const petal = new THREE.ConeGeometry(0.06, len, 4, 1).toNonIndexed();
      petal.scale(1, 1, 0.4);
      petal.translate(0, len / 2, 0);
      petal.rotateX(tilt);
      petal.rotateY((i / n) * Math.PI * 2 + turn);
      parts.push(petal.attributes.position.array);
    }
  }
  const all = new Float32Array(parts.reduce((sum, a) => sum + a.length, 0));
  let at = 0;
  for (const a of parts) {
    all.set(a, at);
    at += a.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(all, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildPond(scene, calm) {
  const rnd = seeded(23);
  // The floor of the pond, dark and muddy, so the water looks deep.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(W.pondRadius, 48), mat('#3d5a3a'));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = W.floorY;
  scene.add(floor);

  // The water: a fine grid whose corners rise and fall with a few slow sine
  // waves. The graphics chip moves the corners itself (a small addition to
  // the shader), so the page has nothing to compute for it; the flat shading
  // works out the light of every triangle from its tilt on its own.
  const size = W.pondRadius * 2 + 4;
  const waterGeo = new THREE.PlaneGeometry(size, size, 72, 72);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: W.water.color,
    roughness: 0.45,
    metalness: 0.05,
    transparent: true,
    opacity: W.water.opacity,
    flatShading: true,
    depthWrite: false,
  });
  const waveTime = { value: 0 };
  const waveHeight = { value: calm ? W.water.wave * 0.35 : W.water.wave };
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.waveTime = waveTime;
    shader.uniforms.waveHeight = waveHeight;
    shader.vertexShader =
      'uniform float waveTime;\nuniform float waveHeight;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y += waveHeight * (sin(position.x * 0.55 + waveTime * 0.9) + sin(position.z * 0.43 - waveTime * 0.7)
          + 0.6 * sin((position.x + position.z) * 0.9 + waveTime * 1.4));`,
      );
  };
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = W.waterY;
  water.receiveShadow = true;
  scene.add(water);

  // Soft light spots that drift over the water (a painted texture, added on top).
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const r = 6 + rnd() * 16;
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, 'rgba(255,255,240,0.55)');
      grad.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x + dx, y + dy, r * 1.6, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const spotsTex = new THREE.CanvasTexture(canvas);
  spotsTex.wrapS = spotsTex.wrapT = THREE.RepeatWrapping;
  spotsTex.repeat.set(10, 10);
  spotsTex.colorSpace = THREE.SRGBColorSpace;
  const spots = new THREE.Mesh(
    new THREE.CircleGeometry(W.pondRadius, 48),
    new THREE.MeshBasicMaterial({ map: spotsTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.16 }),
  );
  spots.rotation.x = -Math.PI / 2;
  spots.position.y = W.waterY + 0.05;
  scene.add(spots);

  // Water lilies: round leaves with a notch, some with a pink flower.
  const lilies = [];
  while (lilies.length < 16) {
    const p = onRing(rnd, W.islandRadius + 2.5, W.pondRadius - 2);
    if (nearMill(p.x, p.z, 5) || lilies.some((l) => Math.hypot(l.x - p.x, l.z - p.z) < 2)) continue;
    lilies.push({ x: p.x, z: p.z, s: 0.7 + rnd() * 0.6, ry: rnd() * 6.3, phase: rnd() * 6.3, flower: rnd() < 0.4 });
  }
  const leafGeo = new THREE.CircleGeometry(0.75, 12, 0.35, Math.PI * 2 - 0.7);
  leafGeo.rotateX(-Math.PI / 2);
  const leaves = instances(leafGeo, mat('#4f9a3e', { side: THREE.DoubleSide }), lilies.length, () => ({ x: 0, y: 0, z: 0 }));
  const flowers = lilies.filter((l) => l.flower);
  const petals = instances(flowerGeo(), mat('#f4a6c4', { side: THREE.DoubleSide, emissive: '#5a2038', emissiveIntensity: 0.3 }), flowers.length, () => ({ x: 0, y: 0, z: 0 }));
  const hearts = instances(new THREE.IcosahedronGeometry(0.09, 0), mat('#ffd84a'), flowers.length, () => ({ x: 0, y: 0, z: 0 }));
  scene.add(leaves, petals, hearts);

  // Reeds in clumps at the edge of the pond and a few by the island, with brown tops.
  const stalks = [];
  const clumps = [];
  for (let c = 0; c < 22; c++) {
    // A few low clumps stand in the water off the island, the rest along the shore.
    const byIsland = c < 4;
    const p = byIsland ? onRing(rnd, W.islandRadius + 1.3, W.islandRadius + 1.6) : onRing(rnd, W.pondRadius - 1.6, W.pondRadius - 0.6);
    if (nearMill(p.x, p.z, 6)) continue;
    clumps.push(p);
    const n = 8 + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) {
      const h = byIsland ? 0.6 + rnd() * 0.6 : 1.2 + rnd() * 1.4;
      const spread = byIsland ? 0.8 : 1.4;
      stalks.push({ x: p.x + (rnd() - 0.5) * spread, z: p.z + (rnd() - 0.5) * spread, h, rx: (rnd() - 0.5) * 0.25, rz: (rnd() - 0.5) * 0.25, top: rnd() < 0.4 });
    }
  }
  const stalkGeo = new THREE.CylinderGeometry(0.025, 0.04, 1, 4);
  stalkGeo.translate(0, 0.5, 0);
  scene.add(
    instances(stalkGeo, mat('#6f9a3a'), stalks.length, (i) => ({ x: stalks[i].x, y: W.floorY + 1, z: stalks[i].z, s: [1, stalks[i].h + 0.8, 1], rx: stalks[i].rx, rz: stalks[i].rz, color: i % 3 ? '#6f9a3a' : '#88ad48' })),
  );
  const tops = stalks.filter((s) => s.top);
  const cattail = new THREE.CapsuleGeometry(0.07, 0.3, 2, 6);
  scene.add(
    instances(cattail, mat('#7a4a28'), tops.length, (i) => {
      const s = tops[i];
      // The top sits at the end of the leaning stalk.
      const len = s.h + 0.8;
      return { x: s.x - Math.sin(s.rz) * len, y: W.floorY + 1 + len * Math.cos(s.rx) * Math.cos(s.rz), z: s.z + Math.sin(s.rx) * len, rx: s.rx, rz: s.rz };
    }),
  );

  // Round stones along the shore.
  const stones = [];
  for (let i = 0; i < 46; i++) {
    const p = onRing(rnd, W.pondRadius - 0.9, W.pondRadius + 0.7);
    if (nearMill(p.x, p.z, 4)) continue;
    const s = 0.35 + rnd() * 0.6;
    stones.push({ x: p.x, y: W.waterY + 0.1, z: p.z, s: [s * 1.3, s * 0.7, s], ry: rnd() * 6, color: ['#9a9a92', '#8a8c86', '#a8a59a'][i % 3] });
  }
  scene.add(instances(roughen(new THREE.DodecahedronGeometry(1, 0), 0.25, rnd), mat('#ffffff'), stones.length, (i) => stones[i], { shadow: true }));

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const one = new THREE.Vector3();
  return {
    water: waterMat,
    update(t) {
      waveTime.value = t;
      spotsTex.offset.set(Math.sin(t * 0.05) * 0.3, t * 0.012);

      // The lilies bob gently on the waves.
      let f = 0;
      for (let i = 0; i < lilies.length; i++) {
        const l = lilies[i];
        const y = W.waterY + 0.04 + (calm ? 0 : Math.sin(t * 0.8 + l.phase) * 0.03);
        q.setFromAxisAngle(axis, l.ry + (calm ? 0 : Math.sin(t * 0.2 + l.phase) * 0.1));
        m4.compose(v.set(l.x, y, l.z), q, one.set(l.s, l.s, l.s));
        leaves.setMatrixAt(i, m4);
        if (l.flower) {
          const fx = l.x + Math.cos(l.ry) * 0.2 * l.s;
          const fz = l.z - Math.sin(l.ry) * 0.2 * l.s;
          m4.compose(v.set(fx, y, fz), q, one.set(1, 1, 1));
          petals.setMatrixAt(f, m4);
          m4.compose(v.set(fx, y + 0.05, fz), q, one.set(1, 1, 1));
          hearts.setMatrixAt(f, m4);
          f++;
        }
      }
      leaves.instanceMatrix.needsUpdate = true;
      petals.instanceMatrix.needsUpdate = true;
      hearts.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildIsland(scene) {
  const rnd = seeded(5);
  const R = W.islandRadius;
  // The island: a low round hill of earth with grass on top and a sandy edge.
  const earth = new THREE.Mesh(
    roughen(new THREE.CylinderGeometry(R, R + 1.4, W.islandY - W.floorY, 28, 1), 0.35, rnd, W.islandY - (W.islandY + W.floorY) / 2),
    mat('#7d5e3b'),
  );
  earth.position.y = (W.islandY + W.floorY) / 2;
  earth.receiveShadow = true;
  // A little wider than the earth's top, so its rough edge never shows.
  const grassGeo = new THREE.CircleGeometry(R + 0.3, 28);
  grassGeo.rotateX(-Math.PI / 2);
  const grass = new THREE.Mesh(grassGeo, mat('#7db556'));
  grass.position.y = W.islandY + 0.005;
  grass.receiveShadow = true;
  const sand = new THREE.Mesh(roughen(new THREE.CylinderGeometry(R + 0.8, R + 1.3, 0.3, 28, 1), 0.25, rnd), mat('#d8c08a'));
  sand.position.y = W.waterY + 0.08;
  sand.receiveShadow = true;
  scene.add(earth, grass, sand);

  // Places on the grass outside the board.
  const free = [];
  const half = CONFIG.board.spacing * 3 + 1;
  while (free.length < 90) {
    const p = onRing(rnd, 2, R - 0.4);
    if (Math.abs(p.x) < half && Math.abs(p.z) < half) continue;
    // The rows of pieces still to place stand here.
    if (Math.abs(p.x) < half && Math.abs(Math.abs(p.z) - CONFIG.anim.handRow) < 0.5) continue;
    // ... and the lanterns.
    if (LANTERNS.some((l) => Math.hypot(l.x - p.x, l.z - p.z) < 0.7)) continue;
    free.push(p);
  }
  const at = (i, y) => ({ x: free[i].x, y, z: free[i].z });

  // Tufts of grass.
  const tuft = new THREE.ConeGeometry(0.12, 0.35, 4);
  scene.add(instances(tuft, mat('#5f9a40'), 50, (i) => ({ ...at(i, W.islandY + 0.15), s: 0.8 + rnd() * 0.8, ry: rnd() * 6, color: i % 2 ? '#5f9a40' : '#6faa48' })));

  // Flowers: a thin stem with a coloured head.
  const flowerColours = ['#ffffff', '#ffd84a', '#f48fb1', '#b39ddb', '#ff8a65'];
  const stem = new THREE.CylinderGeometry(0.015, 0.02, 0.4, 4);
  scene.add(instances(stem, mat('#4f8a34'), 26, (i) => at(50 + i, W.islandY + 0.2)));
  scene.add(
    instances(new THREE.IcosahedronGeometry(0.09, 0), mat('#ffffff', { emissive: '#222222' }), 26, (i) => ({
      ...at(50 + i, W.islandY + 0.42),
      s: [1.3, 0.7, 1.3],
      color: flowerColours[i % 5],
    })),
  );

  // Mushrooms: a pale stem and a red or brown cap with white dots.
  const shrooms = free.slice(76, 90);
  const mStem = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6);
  scene.add(instances(mStem, mat('#f3ead6'), shrooms.length, (i) => ({ x: shrooms[i].x, y: W.islandY + 0.11, z: shrooms[i].z }), { shadow: true }));
  const cap = new THREE.SphereGeometry(0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  scene.add(
    instances(cap, mat('#ffffff'), shrooms.length, (i) => ({
      x: shrooms[i].x,
      y: W.islandY + 0.2,
      z: shrooms[i].z,
      s: [1, 0.8, 1],
      color: i % 3 ? '#d8432f' : '#a0703f',
    }), { shadow: true }),
  );
  const dot = new THREE.IcosahedronGeometry(0.03, 0);
  scene.add(
    instances(dot, mat('#ffffff'), shrooms.length * 3, (i) => {
      const s = shrooms[Math.floor(i / 3)];
      const a = (i % 3) * 2.1 + s.a;
      return { x: s.x + Math.cos(a) * 0.09, y: W.islandY + 0.31, z: s.z + Math.sin(a) * 0.09 };
    }),
  );

  // A few stones where the island meets the water.
  const stones = [];
  for (let i = 0; i < 14; i++) {
    const p = onRing(rnd, R + 0.4, R + 1);
    const s = 0.25 + rnd() * 0.3;
    stones.push({ x: p.x, y: W.waterY + 0.12, z: p.z, s: [s * 1.3, s * 0.8, s], ry: rnd() * 6, color: i % 2 ? '#9a9a92' : '#b0ab9c' });
  }
  scene.add(instances(roughen(new THREE.DodecahedronGeometry(1, 0), 0.25, rnd), mat('#ffffff'), stones.length, (i) => stones[i], { shadow: true }));
}

/** The water mill: a little wooden house on posts at the shore and a wheel turning in the water. */
function buildMill(scene) {
  const group = new THREE.Group();
  group.position.set(MILL.x, 0, MILL.z);
  // Its front (+z here) looks towards the island; z < 0 is on land.
  group.rotation.y = Math.atan2(-MILL.x, -MILL.z);
  scene.add(group);

  const wood = mat('#9a6a3c');
  const darkWood = mat('#5e3d22');
  const wall = mat('#c9a36b');
  const roofMat = mat('#9c4a32');
  const add = (geo, material, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // The platform at the shore, half over the water, on posts.
  const deckY = W.landY + 0.15;
  add(new THREE.BoxGeometry(4.6, 0.25, 4.4), wood, -1.7, deckY, 0.4);
  for (const x of [-3.8, 0.4]) for (const z of [-1.6, 2.4]) add(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6), darkWood, x, deckY - 1.2, z);

  // The house: plank walls, a door towards the island, a window on each
  // side, a gable roof and a chimney.
  const houseY = deckY + 0.12;
  add(new THREE.BoxGeometry(3.4, 2.5, 3.6), wall, -1.8, houseY + 1.25, 0.6);
  add(new THREE.BoxGeometry(0.9, 1.5, 0.06), darkWood, -2.85, houseY + 0.75, 2.43, false);
  for (const x of [-3.53, -0.07]) add(new THREE.BoxGeometry(0.06, 0.6, 0.7), mat('#3b3328'), x, houseY + 1.6, 0.6, false);
  for (const x of [-3.52, -0.08]) for (const z of [-1.2, 2.4]) add(new THREE.BoxGeometry(0.14, 2.5, 0.14), darkWood, x, houseY + 1.25, z, false);
  const roofGeo = new THREE.CylinderGeometry(2.3, 2.3, 4.2, 3, 1);
  roofGeo.rotateX(Math.PI / 2);
  roofGeo.rotateZ(Math.PI / 2);
  const roof = add(roofGeo, roofMat, -1.8, houseY + 3.1, 0.6);
  roof.scale.set(1, 0.62, 1);
  add(new THREE.BoxGeometry(0.45, 1.2, 0.45), mat('#8a8a84'), -2.6, houseY + 3.9, -0.4);

  // The wheel in front of the house, facing the island: two rims, spokes
  // and paddles, turning round an axle that goes into the front wall.
  const r = W.mill.wheelRadius;
  const wheel = new THREE.Group();
  wheel.position.set(-0.6, W.waterY + r - 0.45, 3.1);
  group.add(wheel);
  for (const z of [-0.42, 0.42]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 5, 18), darkWood);
    rim.position.z = z;
    rim.castShadow = true;
    wheel.add(rim);
  }
  const paddle = new THREE.BoxGeometry(0.5, 0.08, 1);
  const spoke = new THREE.BoxGeometry(r * 2, 0.08, 0.1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.Mesh(paddle, wood);
    p.position.set(Math.cos(a) * (r - 0.05), Math.sin(a) * (r - 0.05), 0);
    p.rotation.z = a;
    p.castShadow = true;
    wheel.add(p);
  }
  for (let i = 0; i < 4; i++) {
    for (const z of [-0.42, 0.42]) {
      const s = new THREE.Mesh(spoke, darkWood);
      s.position.z = z;
      s.rotation.z = (i / 4) * Math.PI;
      wheel.add(s);
    }
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), darkWood);
  axle.rotation.x = Math.PI / 2;
  axle.position.z = -0.35;
  wheel.add(axle);

  // After a mill on the board the wheel turns quickly for a moment.
  let boost = 0;
  return {
    update(dt) {
      wheel.rotation.z += W.mill.wheelSpeed * (1 + boost * W.mill.boost) * dt;
      boost = Math.max(0, boost - dt / W.mill.boostTime);
    },
    spin() {
      boost = 1;
    },
  };
}

/** Builds everything round the board. Returns update(t, dt) for the moving parts. */
/**
 * Four little stone lanterns on the island; at dusk their windows glow and
 * a soft warm pool of light lies on the grass round each of them. The pool is
 * a painted glow, not a real light: real lights would cost every point of
 * the picture some work, also by day.
 */
function buildLanterns(scene) {
  const stone = mat('#a9a59a');
  const dark = mat('#7d796f');
  const glow = new THREE.MeshStandardMaterial({ color: '#fff1c8', emissive: W.lanterns.color, emissiveIntensity: 0, roughness: 0.6, flatShading: true });
  const pool = glowTexture();
  const poolMat = new THREE.MeshBasicMaterial({ map: pool, color: W.lanterns.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const haloMat = new THREE.SpriteMaterial({ map: pool, color: W.lanterns.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const glows = [];
  for (const l of LANTERNS) {
    const g = new THREE.Group();
    g.position.set(l.x, W.islandY, l.z);
    g.rotation.y = Math.atan2(l.x, l.z);
    const part = (geo, m, y) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.y = y;
      mesh.castShadow = true;
      g.add(mesh);
    };
    part(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 6), dark, 0.06);
    part(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 6), stone, 0.33);
    part(new THREE.BoxGeometry(0.4, 0.06, 0.4), stone, 0.57);
    part(new THREE.BoxGeometry(0.26, 0.24, 0.26), glow, 0.72);
    part(new THREE.ConeGeometry(0.34, 0.24, 4), dark, 0.96);
    g.children[g.children.length - 1].rotation.y = Math.PI / 4;
    part(new THREE.SphereGeometry(0.05, 6, 4), dark, 1.1);
    scene.add(g);
    const lightPool = new THREE.Mesh(new THREE.CircleGeometry(W.lanterns.reach, 24), poolMat);
    lightPool.rotation.x = -Math.PI / 2;
    lightPool.position.set(l.x, W.islandY + 0.02, l.z);
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(l.x, W.islandY + 0.75, l.z);
    halo.scale.setScalar(1.1);
    scene.add(lightPool, halo);
    glows.push(lightPool, halo);
  }
  for (const m of glows) m.visible = false;
  return {
    setDusk(d) {
      glow.emissiveIntensity = d * 1.6;
      poolMat.opacity = d * W.lanterns.light;
      haloMat.opacity = d * 0.8;
      for (const m of glows) m.visible = d > 0.01;
    },
  };
}

/** A soft round glow, white in the middle and fading out, painted once. */
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Fireflies: little glowing dots that float over the reeds and the water at dusk. */
function buildFireflies(scene, calm) {
  const rnd = seeded(77);
  const count = W.fireflies.count;
  const home = [];
  for (let i = 0; i < count; i++) {
    // Most near the reeds along the shore, some round the island.
    const near = i % 3 === 0 ? onRing(rnd, W.islandRadius + 0.8, W.islandRadius + 3) : onRing(rnd, W.pondRadius - 4, W.pondRadius - 0.5);
    home.push({ x: near.x, z: near.z, y: W.waterY + 0.4 + rnd() * 1.4, p: rnd() * 6.3, q: rnd() * 6.3 });
  }
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const material = new THREE.PointsMaterial({
    map: glowTexture(),
    color: '#fff27a',
    size: 0.3,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const points = new THREE.Points(geo, material);
  points.visible = false;
  scene.add(points);
  const speed = calm ? 0.25 : 1;
  return {
    update(t, d) {
      points.visible = d > 0.02;
      if (!points.visible) return;
      for (let i = 0; i < count; i++) {
        const h = home[i];
        const k = t * speed;
        pos[i * 3] = h.x + Math.sin(k * 0.4 + h.p) * 0.8;
        pos[i * 3 + 1] = h.y + Math.sin(k * 0.9 + h.q) * 0.25;
        pos[i * 3 + 2] = h.z + Math.cos(k * 0.33 + h.q) * 0.8;
      }
      geo.attributes.position.needsUpdate = true;
      // Each one blinks softly on its own (seen as the group fading a little).
      material.opacity = d * (calm ? 0.9 : 0.75 + 0.25 * Math.sin(t * 2.1));
    },
  };
}

/** Builds everything round the board. Returns update(t, dt) for the moving parts. */
export function buildWorld(scene, calm) {
  const { clouds, sky, cloudMat } = buildSky(scene);
  buildLand(scene);
  buildIsland(scene);
  const pond = buildPond(scene, calm);
  const mill = buildMill(scene);
  const lanterns = buildLanterns(scene);
  const fireflies = buildFireflies(scene, calm);
  const colour = (a, b, d) => new THREE.Color(a).lerp(new THREE.Color(b), d);
  let dusk = 0;
  return {
    /** The water mill's wheel turns quickly for a moment (a mill was closed). */
    spinWheel: mill.spin,
    /** How far it is towards dusk: 0 = afternoon, 1 = dusk. */
    setDusk(d) {
      dusk = d;
      sky.top.value.copy(colour(W.sky.top, W.dusk.top, d));
      sky.horizon.value.copy(colour(W.sky.horizon, W.dusk.horizon, d));
      cloudMat.color.copy(colour('#ffffff', W.dusk.clouds, d));
      cloudMat.emissive.copy(colour('#fff3e6', W.dusk.cloudGlow, d));
      pond.water.color.copy(colour(W.water.color, W.dusk.water, d));
      lanterns.setDusk(d);
    },
    update(t, dt) {
      pond.update(t);
      mill.update(dt);
      fireflies.update(t, dusk);
      clouds.rotation.y = t * (calm ? 0.001 : 0.004);
    },
  };
}
