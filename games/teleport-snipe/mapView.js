// Teleport Snipe – what the temple garden looks like: clean low-poly
// shapes in white and grey stone, red and dark wood, pink cherry blossom,
// green bamboo and light gravel. Everything is built from the numbers in
// map.js: boxes with a "look" are drawn as they are, the props add the
// shapes that are not plain boxes (rocks, trees, lanterns, roofs, ...).

import * as THREE from './vendor/three.module.js';
import { SIZE, WALL_HEIGHT, BOXES, PROPS } from './map.js';

const COLORS = {
  ground: 0xd9cfb9, // packed earth and gravel
  gravel: 0xece5d6,
  stone: 0xb7b2a8,
  stoneDark: 0x8e8a83,
  plaster: 0xf3eee4,
  wood: 0x8a5a36,
  dark: 0x3d2a1f,
  red: 0xc23a2c,
  tiles: 0x4a5560,
  grass: 0x8cbc63,
  grassDark: 0x6f9e4c,
  trunk: 0x5b3a2a,
  blossom: 0xf4b3c8,
  blossomLight: 0xf9d2de,
  bamboo: 0x7fb04a,
  bambooDark: 0x5c8a38,
  water: 0x5d9fb4,
  gold: 0xd9a441,
};

const materials = new Map();
/** One shared material per colour keeps the number of draw settings small. */
function mat(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return materials.get(color);
}

function mesh(geometry, color, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, mat(color));
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** A box between two corners. */
function boxMesh(x0, x1, y0, y1, z0, z1, color, options) {
  const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), color, options);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

const LOOKS = {
  stone: COLORS.stone,
  plaster: COLORS.plaster,
  wood: COLORS.wood,
  dark: COLORS.dark,
  red: COLORS.red,
  tiles: COLORS.tiles,
  grass: COLORS.grass,
};

// ── The temple wall: stone foot, white plaster, tiled roof ────────────
function wall(b, group) {
  group.add(boxMesh(b.x0, b.x1, 0, 0.7, b.z0, b.z1, COLORS.stoneDark));
  group.add(boxMesh(b.x0, b.x1, 0.7, WALL_HEIGHT, b.z0, b.z1, COLORS.plaster));
  // The roof sticks out a little on both sides.
  const along = b.x1 - b.x0 > b.z1 - b.z0;
  const ox = along ? 0 : 0.5;
  const oz = along ? 0.5 : 0;
  group.add(boxMesh(b.x0 - ox, b.x1 + ox, WALL_HEIGHT, WALL_HEIGHT + 0.3, b.z0 - oz, b.z1 + oz, COLORS.tiles));
}

// ── Props ─────────────────────────────────────────────────────────────

/** The raked gravel: a canvas with fine parallel lines. */
function gravel(p, group) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ece5d6';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,135,110,0.35)';
  g.lineWidth = 3;
  for (let y = 8; y < 256; y += 16) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set((p.x1 - p.x0) / 4, (p.z1 - p.z0) / 4);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(p.x1 - p.x0, p.z1 - p.z0),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set((p.x0 + p.x1) / 2, 0.012, (p.z0 + p.z1) / 2);
  m.receiveShadow = true;
  group.add(m);
  // A border of dark stones around it.
  const t = 0.3;
  group.add(boxMesh(p.x0 - t, p.x1 + t, 0, 0.12, p.z0 - t, p.z0, COLORS.stoneDark, { cast: false }));
  group.add(boxMesh(p.x0 - t, p.x1 + t, 0, 0.12, p.z1, p.z1 + t, COLORS.stoneDark, { cast: false }));
  group.add(boxMesh(p.x0 - t, p.x0, 0, 0.12, p.z0, p.z1, COLORS.stoneDark, { cast: false }));
  group.add(boxMesh(p.x1, p.x1 + t, 0, 0.12, p.z0, p.z1, COLORS.stoneDark, { cast: false }));
}

/** A large rock that fills its box: a rough, flat-shaded lump. */
function rock(p, group, seed) {
  const geo = new THREE.IcosahedronGeometry(0.5, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Every triangle has its own copy of its corners. The dent depends only
    // on where a corner is, so all copies of a corner move together and the
    // surface stays closed. The same small dents every time (no randomness).
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 78.233) * 43758.5453;
    const k = 0.84 + 0.16 * (n - Math.floor(n));
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, COLORS.stoneDark);
  // Slightly bigger than the box sideways, so the lump looks as wide as it blocks.
  m.scale.set(p.w * 1.05, p.h * 2, p.d * 1.05);
  m.position.set(p.x, 0, p.z);
  group.add(m);
}

/** A four-sided roof shaped like a low pyramid on top of an eave. */
function roof(p, group) {
  const d = p.d || p.w;
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  const m = mesh(geo, COLORS.tiles);
  m.scale.set(p.w, p.h, d);
  m.position.set(p.x, p.y + p.h / 2, p.z);
  group.add(m);
}

function spire(p, group) {
  const m = mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.4, 6), COLORS.gold);
  m.position.set(p.x, p.y + 1.2, p.z);
  group.add(m);
  for (let i = 0; i < 4; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.22, 0.05, 4, 10), COLORS.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(p.x, p.y + 0.6 + i * 0.35, p.z);
    group.add(ring);
  }
}

/** Dark wooden posts and a band on the tea house's white walls. */
function teahouse(p, group) {
  const s = 0.18;
  for (const x of [p.x0, (p.x0 + p.x1) / 2, p.x1]) {
    for (const z of [p.z0, p.z1]) {
      group.add(boxMesh(x - s / 2, x + s / 2, p.y0, p.y1, z - s / 2, z + s / 2, COLORS.dark));
    }
  }
  for (const z of [(p.z0 + p.z1) / 2]) {
    for (const x of [p.x0, p.x1]) {
      group.add(boxMesh(x - s / 2, x + s / 2, p.y0, p.y1, z - s / 2, z + s / 2, COLORS.dark));
    }
  }
  const y = p.y0 + 1.7;
  group.add(boxMesh(p.x0 - 0.05, p.x1 + 0.05, y, y + 0.12, p.z0 - 0.05, p.z1 + 0.05, COLORS.dark));
}

function bell(p, group) {
  const h = p.y1 - p.y0;
  const m = mesh(new THREE.CylinderGeometry(0.36, 0.48, h, 10), 0x6e7d5e);
  m.position.set(p.x, (p.y0 + p.y1) / 2, p.z);
  group.add(m);
}

function pond(p, group) {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(p.x1 - p.x0, p.z1 - p.z0),
    new THREE.MeshLambertMaterial({ color: COLORS.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((p.x0 + p.x1) / 2, 0.02, (p.z0 + p.z1) / 2);
  group.add(water);
  // Round stones along the edge.
  const geo = new THREE.DodecahedronGeometry(0.32, 0);
  const add = (x, z, i) => {
    const m = mesh(geo, i % 3 ? COLORS.stone : COLORS.stoneDark, { cast: false });
    m.position.set(x, 0.08, z);
    m.scale.y = 0.55;
    m.rotation.y = i;
    group.add(m);
  };
  let i = 0;
  for (let x = p.x0; x <= p.x1; x += 0.7) {
    add(x, p.z0, i++);
    add(x, p.z1, i++);
  }
  for (let z = p.z0 + 0.7; z < p.z1; z += 0.7) {
    add(p.x0, z, i++);
    add(p.x1, z, i++);
  }
  // A few koi.
  const koi = new THREE.SphereGeometry(0.18, 6, 4);
  for (const [x, z, color] of [
    [8, 13, 0xf28a3c],
    [9.2, 16.4, 0xffffff],
    [15.6, 12.6, 0xf28a3c],
    [16.4, 15.8, 0xe8453c],
  ]) {
    const m = mesh(koi, color, { cast: false });
    m.scale.set(1, 0.5, 2.4);
    m.position.set(x, 0.05, z);
    m.rotation.y = x;
    group.add(m);
  }
}

/** A stone lantern: foot, post, light box with a paper glow, roof and knob. */
function lantern(p, group) {
  const parts = [
    [new THREE.CylinderGeometry(0.34, 0.38, 0.2, 6), 0.1, COLORS.stoneDark],
    [new THREE.CylinderGeometry(0.12, 0.14, 0.6, 6), 0.5, COLORS.stone],
    [new THREE.CylinderGeometry(0.3, 0.26, 0.12, 6), 0.86, COLORS.stone],
    [new THREE.BoxGeometry(0.36, 0.3, 0.36), 1.07, 0xfff1c9],
    [new THREE.ConeGeometry(0.46, 0.32, 6), 1.38, COLORS.stoneDark],
    [new THREE.SphereGeometry(0.08, 6, 4), 1.6, COLORS.stone],
  ];
  for (const [geo, y, color] of parts) {
    const m = mesh(geo, color);
    m.position.set(p.x, y, p.z);
    group.add(m);
  }
}

/** A cherry tree: a bent trunk and a crown of pink blossom balls. */
function tree(p, group, seed) {
  const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.9, 7), COLORS.trunk);
  trunk.position.set(p.x, 1.45, p.z);
  trunk.rotation.z = 0.05 * Math.sin(seed);
  group.add(trunk);
  const balls = [
    [0, 3.7, 0, 1.35],
    [0.9, 3.4, 0.4, 1.0],
    [-0.8, 3.5, -0.3, 1.05],
    [0.2, 4.4, -0.6, 0.95],
    [-0.4, 3.3, 0.8, 0.9],
  ];
  balls.forEach(([dx, y, dz, r], i) => {
    const color = (i + seed) % 2 ? COLORS.blossom : COLORS.blossomLight;
    const m = mesh(new THREE.IcosahedronGeometry(r, 1), color);
    m.position.set(p.x + dx, y, p.z + dz);
    group.add(m);
  });
}

/** A bamboo grove: many thin stalks, drawn as one instanced mesh per colour. */
function bamboo(groves, group) {
  const spots = [];
  groves.forEach((p, g) => {
    for (let x = p.x0 + 0.25; x < p.x1; x += 0.45) {
      for (let z = p.z0 + 0.25; z < p.z1; z += 0.45) {
        const n = Math.sin(x * 12.9898 + z * 78.233 + g) * 43758.5453;
        const r = n - Math.floor(n);
        spots.push([x + (r - 0.5) * 0.3, z + (r - 0.5) * 0.25, 5.2 + r * 1.6, r]);
      }
    }
  });
  const geo = new THREE.CylinderGeometry(0.06, 0.07, 1, 5);
  geo.translate(0, 0.5, 0);
  for (const [color, pick] of [
    [COLORS.bamboo, (r) => r >= 0.4],
    [COLORS.bambooDark, (r) => r < 0.4],
  ]) {
    const list = spots.filter((s) => pick(s[3]));
    const inst = new THREE.InstancedMesh(geo, mat(color), list.length);
    const m4 = new THREE.Matrix4();
    list.forEach(([x, z, h], i) => {
      m4.makeScale(1, h, 1).setPosition(x, 0, z);
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = true;
    group.add(inst);
  }
  // Leafy tops, so the grove reads as a green mass from afar.
  for (const p of groves) {
    const m = mesh(new THREE.BoxGeometry(p.x1 - p.x0 + 0.4, 1.4, p.z1 - p.z0 + 0.4), COLORS.bambooDark);
    m.position.set((p.x0 + p.x1) / 2, 5.6, (p.z0 + p.z1) / 2);
    group.add(m);
  }
}

function steppingStone(p, group, seed) {
  const m = mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.08, 7), COLORS.stone, { cast: false });
  m.position.set(p.x, 0.04, p.z);
  m.rotation.y = seed;
  group.add(m);
}

export function buildMapView() {
  const group = new THREE.Group();

  // The ground reaches a little under the wall, so no gap is ever seen.
  const ground = boxMesh(-SIZE / 2 - 2, SIZE / 2 + 2, -0.2, 0, -SIZE / 2 - 2, SIZE / 2 + 2, COLORS.ground, {
    cast: false,
  });
  group.add(ground);

  for (const b of BOXES) {
    if (b.look === 'wall') wall(b, group);
    else if (b.look === 'grass') {
      group.add(boxMesh(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1, COLORS.grass));
      // A darker band at the foot of each tier makes the steps readable.
      group.add(boxMesh(b.x0 - 0.01, b.x1 + 0.01, b.y1 - 0.4, b.y1 - 0.25, b.z0 - 0.01, b.z1 + 0.01, COLORS.grassDark, { cast: false }));
    } else if (b.look) group.add(boxMesh(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1, LOOKS[b.look]));
  }

  const groves = [];
  PROPS.forEach((p, i) => {
    if (p.type === 'gravel') gravel(p, group);
    else if (p.type === 'rock') rock(p, group, i);
    else if (p.type === 'roof') roof(p, group);
    else if (p.type === 'spire') spire(p, group);
    else if (p.type === 'teahouse') teahouse(p, group);
    else if (p.type === 'bell') bell(p, group);
    else if (p.type === 'pond') pond(p, group);
    else if (p.type === 'lantern') lantern(p, group);
    else if (p.type === 'tree') tree(p, group, i);
    else if (p.type === 'bamboo') groves.push(p);
    else if (p.type === 'stone') steppingStone(p, group, i);
  });
  bamboo(groves, group);
  return group;
}
