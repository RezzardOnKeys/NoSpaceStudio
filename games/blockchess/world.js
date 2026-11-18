// Blockchess – the block world: a floating island, the raised board, trees,
// flowers, torches, clouds and the sky with sun, moon and stars.
import * as THREE from './vendor/three.module.js';
import { hash, rnd, noise, speck, art, material, tex } from './textures.js';

// ---------- Block textures (16x16) ----------
const dirtCols = ['#866043', '#79553a', '#966c4a', '#6c4a30', '#8b6446'];
const dirt = noise(dirtCols, 21);
const grassCols = ['#5d9b3a', '#6aab42', '#558e34', '#73b54b', '#4f8530'];
const grassTop = noise(grassCols, 22);
const grassSide = (x, y) => (y < 3 + (hash(x, 0, 23) % 2) ? grassTop(x, y) : dirt(x, y));
const stone = speck(noise(['#808080', '#7a7a7a', '#878787', '#747474', '#8c8c8c'], 24), '#686868', 10, 25, 2);
const bark = (x, y) => {
  const c = ['#6b5131', '#5e4629', '#735836', '#4f3a21'];
  return c[(hash(x, Math.floor(y / 3), 26) + (x % 3 === 0 ? 3 : 0)) % c.length];
};
const logTop = (x, y) => {
  const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  if (d > 6.5) return bark(x, y);
  return Math.floor(d) % 2 ? '#b0905a' : '#9a7a48';
};
const leaves = (x, y) => (hash(x, y, 27) % 9 === 0 ? null : noise(['#3f7d25', '#4a8c2c', '#36701f', '#559a34'], 28)(x, y));
const planks = (cols, seam, s) => (x, y) => {
  if (y % 4 === 3) return seam;
  const off = (Math.floor(y / 4) % 2) * 8;
  if ((x + off) % 16 === 0) return seam;
  return cols[hash(x, Math.floor(y / 4), s) % cols.length];
};
const lightPlanks = planks(['#d9c58f', '#d0bb83', '#e0cd98', '#cbb57c'], '#a48b55', 30);
const darkPlanks = planks(['#4b3220', '#432c1c', '#523724', '#3c281a'], '#2a1b10', 31);
const bricks = (x, y) => {
  if (y % 8 === 7 || y % 8 === 3) return '#5c5c5c';
  const off = (Math.floor(y / 4) % 2) * 4;
  if ((x + off) % 8 === 0) return '#5c5c5c';
  return noise(['#959595', '#8a8a8a', '#9e9e9e'], 32)(x, y);
};

const MATS = {
  grass: [grassSide, grassSide, grassTop, dirt, grassSide, grassSide],
  dirt: [dirt], stone: [stone], log: [bark, bark, logTop, logTop, bark, bark],
  leaves: [leaves], light: [lightPlanks], dark: [darkPlanks], brick: [bricks],
};
function blockMaterials(type) {
  const p = MATS[type];
  const faces = p.length === 1 ? Array(6).fill(p[0]) : p;
  return faces.map((f) => material(f, 16, 16));
}

// ---------- Noise for the terrain ----------
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const sm = (t) => t * t * (3 - 2 * t);
  const a = rnd(xi, zi, s), b = rnd(xi + 1, zi, s), c = rnd(xi, zi + 1, s), d = rnd(xi + 1, zi + 1, s);
  const u = sm(xf), v = sm(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function buildWorld(scene) {
  const blocks = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  const set = (i, j, k, t) => blocks.set(key(i, j, k), t);
  const tops = new Map(); // column -> height of the surface (block j)
  const trees = [];

  for (let i = -28; i <= 28; i++) {
    for (let k = -28; k <= 28; k++) {
      const cx = i + 0.5, cz = k + 0.5;
      const dist = Math.hypot(cx, cz);
      const R = 17 + vnoise(cx * 0.12 + 50, cz * 0.12, 5) * 8;
      if (dist > R) continue;
      const bottom = -3 - Math.floor((R - dist) * 0.7) - Math.floor(vnoise(cx * 0.3, cz * 0.3, 9) * 3);
      const onBoard = i >= -5 && i <= 4 && k >= -5 && k <= 4;
      let h;
      if (onBoard) h = -1;
      else if (dist < 8) h = -2;
      else {
        const ramp = Math.min(1, (dist - 8) / 5);
        h = -2 + Math.round(vnoise(cx * 0.1, cz * 0.1, 11) * 4 * ramp);
        if (dist > R - 1.5) h -= 1;
      }
      for (let j = bottom; j <= h; j++) {
        let t;
        if (onBoard && j === -1) {
          const inner = i >= -4 && i <= 3 && k >= -4 && k <= 3;
          if (inner) {
            const f = i + 4, r = 3 - k; // file a..h, rank 1..8
            t = (f + r) % 2 === 0 ? 'dark' : 'light';
          } else t = 'brick';
        } else if (j === h) t = 'grass';
        else if (j >= h - 2) t = 'dirt';
        else t = 'stone';
        set(i, j, k, t);
      }
      if (!onBoard) tops.set(`${i},${k}`, h);
      if (!onBoard && dist > 10 && dist < R - 3 && hash(i, k, 40) % 100 < 4) {
        if (trees.every(([a, b]) => Math.abs(a - i) + Math.abs(b - k) > 6)) trees.push([i, k, h]);
      }
    }
  }

  // Trees
  for (const [i, k, h] of trees) {
    const height = 4 + (hash(i, k, 41) % 2);
    for (let y = 1; y <= height; y++) set(i, h + y, k, 'log');
    const top = h + height;
    for (let dy = -1; dy <= 2; dy++) {
      const r = dy <= 0 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (r === 1 ? dy === 2 : hash(i + dx, k + dz, 42 + dy) % 2)) continue;
          const kk = key(i + dx, top + dy, k + dz);
          if (!blocks.has(kk)) blocks.set(kk, 'leaves');
        }
      }
    }
  }

  // Only blocks that can be seen become instances
  const groups = {};
  const solid = (i, j, k) => { const t = blocks.get(key(i, j, k)); return t && t !== 'leaves'; };
  for (const [kk, t] of blocks) {
    const [i, j, k] = kk.split(',').map(Number);
    const exposed = !solid(i + 1, j, k) || !solid(i - 1, j, k) || !solid(i, j + 1, k) ||
      !solid(i, j - 1, k) || !solid(i, j, k + 1) || !solid(i, j, k - 1);
    if (!exposed) continue;
    (groups[t] ||= []).push([i, j, k]);
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4();
  for (const [t, list] of Object.entries(groups)) {
    const mesh = new THREE.InstancedMesh(unit, blockMaterials(t), list.length);
    list.forEach(([i, j, k], n) => mesh.setMatrixAt(n, m4.makeTranslation(i + 0.5, j + 0.5, k + 0.5)));
    mesh.castShadow = t !== 'stone' && t !== 'dirt';
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  addFlowers(scene, tops, blocks, key);
  addLabels(scene);
  const torches = addTorches(scene);
  const clouds = addClouds(scene);
  const sky = addSky(scene);

  return {
    update(t, dt, night, camera) {
      clouds.update(t);
      sky.update(night, camera);
      torches.forEach((l, n) => {
        l.intensity = (0.6 + night * 5) * (0.9 + 0.1 * Math.sin(t * 9 + n * 2) + 0.05 * Math.sin(t * 23 + n));
      });
    },
  };
}

// ---------- Flowers and grass ----------
function addFlowers(scene, tops, blocks, key) {
  const flower = (petal, center) => art([
    '................', '................', '................', '................',
    '......pp........', '.....pccp.......', '......pp........', '.......g........',
    '.......g..gg....', '.......g.g......', '....gg.gg.......', '......gg........',
    '.......g........', '.......g........', '.......g........', '.......g........',
  ], { p: petal, c: center, g: ['#3f8a28', '#4b9a30'], '.': null });
  const tall = (x, y) => {
    const blade = [2, 5, 7, 10, 12, 14][x % 6] === x && y > 4 + (hash(x, 0, 60) % 6);
    const blade2 = (x === 4 || x === 9 || x === 13) && y > 7 + (hash(x, 1, 61) % 4);
    return blade || blade2 ? noise(['#5d9b3a', '#6aab42', '#4f8530'], 62)(x, y) : null;
  };
  const kinds = [
    flower(['#e8302c', '#d42622'], '#f5d142'),
    flower(['#f5d142', '#e8c22a'], '#c98a12'),
    flower(['#7fa8ff', '#6a92ee'], '#ffffff'),
    tall, tall, tall,
  ];
  const plane = new THREE.PlaneGeometry(1, 1);
  for (const [col, h] of tops) {
    const [i, k] = col.split(',').map(Number);
    const d = Math.hypot(i + 0.5, k + 0.5);
    if (d < 7 || hash(i, k, 63) % 100 > 13) continue;
    if (blocks.has(key(i, h + 1, k))) continue;
    const mat = material(kinds[hash(i, k, 64) % kinds.length], 16, 16, { side: THREE.DoubleSide });
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      const m = new THREE.Mesh(plane, mat);
      m.position.set(i + 0.5, h + 1.5, k + 0.5);
      m.rotation.y = r;
      scene.add(m);
    }
  }
}

// ---------- Board labels ----------
function addLabels(scene) {
  const mk = (ch) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 8, 9);
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  };
  const plane = new THREE.PlaneGeometry(0.7, 0.7);
  const place = (ch, x, z, rot) => {
    const m = new THREE.Mesh(plane, mk(ch));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, 0.005, z);
    scene.add(m);
  };
  for (let f = 0; f < 8; f++) {
    place('abcdefgh'[f], f - 3.5, 4.5, 0);
    place('abcdefgh'[f], f - 3.5, -4.5, Math.PI);
  }
  for (let r = 0; r < 8; r++) {
    place(String(r + 1), -4.5, 3.5 - r, 0);
    place(String(r + 1), 4.5, 3.5 - r, Math.PI);
  }
}

// ---------- Torches at the corners of the board ----------
function addTorches(scene) {
  const stick = noise(['#6b4a2a', '#5e4024', '#7a5530'], 70);
  const flame = (x, y) => (y === 0 ? '!#fff3b0' : y === 1 ? '!#ffc13a' : '!#ff8a1c');
  const lights = [];
  for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const s = new THREE.Mesh(new THREE.BoxGeometry(2 / 16, 10 / 16, 2 / 16), material(stick, 2, 10));
    s.position.y = 5 / 16; s.castShadow = true;
    const f = new THREE.Mesh(new THREE.BoxGeometry(2 / 16, 3 / 16, 2 / 16), material(flame, 2, 3));
    f.position.y = 11.5 / 16;
    g.add(s, f);
    const l = new THREE.PointLight('#ffae4a', 1, 9, 1.6);
    l.position.y = 1;
    g.add(l);
    lights.push(l);
    scene.add(g);
  }
  return lights;
}

// ---------- Clouds ----------
function addClouds(scene) {
  const cells = [];
  for (let a = -20; a < 20; a++) {
    for (let b = -20; b < 20; b++) {
      if (vnoise(a * 0.35, b * 0.35, 80) > 0.66) cells.push([a * 4, b * 4]);
    }
  }
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, emissive: '#666666' });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 1.2, 4), mat, cells.length);
  scene.add(mesh);
  const m4 = new THREE.Matrix4();
  return {
    mesh,
    update(t) {
      cells.forEach(([x, z], n) => {
        const xx = ((x + t * 0.8 + 80) % 160 + 160) % 160 - 80;
        mesh.setMatrixAt(n, m4.makeTranslation(xx, 26, z));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------- Sky, sun, moon, stars ----------
function addSky(scene) {
  const sunTex = tex((x, y) => {
    const e = x === 0 || y === 0 || x === 7 || y === 7;
    return e ? '#ffe680' : '#fffbe0';
  }, 8, 8);
  const moonTex = tex((x, y) => (hash(x, y, 90) % 5 === 0 ? '#a9b2c6' : '#e3e8f5'), 8, 8);
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: sunTex, fog: false }));
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: moonTex, fog: false }));
  scene.add(sun, moon);

  const starPos = [];
  for (let n = 0; n < 900; n++) {
    const u = rnd(n, 1, 91), v = rnd(n, 2, 92);
    const th = u * Math.PI * 2, ph = Math.acos(v * 0.95);
    starPos.push(Math.cos(th) * Math.sin(ph) * 120, Math.cos(ph) * 120, Math.sin(th) * Math.sin(ph) * 120);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, fog: false }));
  scene.add(stars);

  const day = new THREE.Color('#8fc3ff'), nightC = new THREE.Color('#0b1030');
  const sunDir = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
  return {
    update(night, camera) {
      scene.background.copy(day).lerp(nightC, night);
      scene.fog.color.copy(scene.background);
      stars.material.opacity = night;
      const ang = night * Math.PI; // the sun sinks below the horizon, the moon comes up
      const s = sunDir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -ang * 0.9);
      sun.position.copy(s).multiplyScalar(90).add(camera.position);
      moon.position.copy(s).multiplyScalar(-90).add(camera.position);
      sun.lookAt(camera.position);
      moon.lookAt(camera.position);
      sun.visible = night < 0.95;
      moon.visible = night > 0.05;
    },
  };
}
