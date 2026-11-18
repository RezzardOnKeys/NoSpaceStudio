// Blockchess – our own block pieces. Sizes are in pixels (1 px = 1/24 of a
// square); every figure looks towards +z.
import * as THREE from './vendor/three.module.js';
import { hash, noise, art, speck, solid, material } from './textures.js';

const S = 1 / 24;

// ---------- Building helpers ----------
const geoCache = new Map();
function geo(w, h, d) {
  const k = `${w},${h},${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
const SIDE = new Set(['front', 'back', 'left', 'right']);
// x/z = centre, yb = bottom edge
function box(parent, w, h, d, x, yb, z, paint, o = {}) {
  const p = typeof paint === 'function' ? { all: paint } : paint;
  const pick = (k) => p[k] ?? (SIDE.has(k) ? p.side : undefined) ?? p.all;
  const dims = { right: [d, h], left: [d, h], top: [w, d], bottom: [w, d], front: [w, h], back: [w, h] };
  const mats = ['right', 'left', 'top', 'bottom', 'front', 'back'].map((k) => material(pick(k), ...dims[k]));
  const m = new THREE.Mesh(geo(w, h, d), mats);
  m.position.set(x, yb + h / 2, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
// A limb that swings from its top end
function limb(parent, w, h, d, x, top, z, paint) {
  const g = pivot(parent, x, top, z);
  box(g, w, h, d, 0, -h, 0, paint);
  return g;
}
const bottomRows = (n, a, b) => (x, y, w, h) => (y >= h - n ? a(x, y, w, h) : b(x, y, w, h));
const topRows = (n, a, b) => (x, y, w, h) => (y < n ? a(x, y, w, h) : b(x, y, w, h));
const N = noise;

// ---------- Palettes ----------
const P = {
  skin: N(['#e2ae80', '#d9a476', '#e6b68b'], 1),
  oldSkin: N(['#d9a582', '#cf9a77', '#ddb08f'], 2),
  hairBrown: N(['#5a3a1e', '#4e321a', '#634221'], 3),
  hairGold: N(['#e8c050', '#d9ae3c', '#f0cf6a'], 4),
  white: N(['#f2f2f2', '#e6e6e6', '#ffffff'], 5),
  wood: N(['#7a5230', '#6b4728', '#8a5e38'], 6),
  iron: N(['#c8c8c8', '#b5b5b5', '#dadada', '#a8a8a8'], 7),
  darkIron: N(['#4a4a52', '#404048', '#55555e'], 8),
  gold: N(['#f5d142', '#e8b923', '#ffe066', '#d9a81d'], 9),
  tunic: N(['#3b5fa8', '#34539a', '#4569b5'], 10),
  pants: N(['#5c3d24', '#523620', '#66452a'], 11),
  shoe: N(['#3a2616', '#2f1f12'], 12),
  robe: N(['#7a5a3a', '#6e5034', '#866443'], 13),
  rope: N(['#c9b27a', '#b89f66'], 14),
  purple: N(['#6a3fa0', '#5e3790', '#7748b0'], 15),
  red: N(['#a3262a', '#8f2024', '#b52e32'], 16),
  stone: speck(N(['#8d8d8d', '#7f7f7f', '#9a9a9a', '#747474'], 17), N(['#5b8a36', '#4f7a2e'], 18), 12, 19, 2),
  horse: N(['#8b5a2b', '#7d5026', '#96622f'], 20),
  mane: N(['#3b2414', '#2e1c10'], 21),
  bone: N(['#e8e2cf', '#d9d2bc', '#cfc7ae'], 22),
  rust: N(['#8a4b2a', '#7a4024', '#9a5833', '#6b3a22'], 23),
  obsidian: speck(N(['#1d1428', '#2a1d3a', '#140e1e', '#3a2852'], 24), '!#ff7a1a', 7, 25),
  fungusSkin: N(['#b9b3a2', '#aaa492', '#c4bfae'], 26),
  mossRobe: speck(N(['#4a3a28', '#3f3122', '#54432f'], 27), '#4f7a2e', 15, 28),
  spider: N(['#2b2f4a', '#252840', '#33385a'], 29),
  goblin: N(['#6f9a3a', '#638a33', '#7aa843'], 30),
  leather: N(['#3a2a1e', '#33251a', '#443123'], 31),
  night: N(['#1e2240', '#191c36', '#262b52'], 32),
  pale: N(['#c9c3d6', '#bdb6cc', '#d2cde0'], 33),
  black: N(['#141418', '#1b1b21', '#0f0f12'], 34),
  plate: N(['#2c2c34', '#24242b', '#36363f'], 35),
  cape: N(['#4a1010', '#3e0d0d', '#561414'], 36),
  charcoal: N(['#3a3536', '#332e2f', '#423c3d'], 37),
};
const G = (c) => solid('!' + c); // glowing colour

// ================= WHITE: the Village Guard =================

function villager() {
  const g = new THREE.Group(), sw = [];
  const leg = bottomRows(2, P.shoe, P.pants);
  const legL = limb(g, 4, 10, 4, -2, 10, 0, leg), legR = limb(g, 4, 10, 4, 2, 10, 0, leg);
  const belt = (x, y, w, h) => (y === 6 ? (w === 8 && (x === 3 || x === 4) ? '#c9a227' : '#4a2f18') : P.tunic(x, y));
  box(g, 8, 10, 4, 0, 10, 0, belt);
  const sleeve = bottomRows(3, P.skin, P.tunic);
  const armL = limb(g, 4, 10, 4, -6, 20, 0, sleeve), armR = limb(g, 4, 10, 4, 6, 20, 0, sleeve);
  armR.rotation.x = -0.35;
  box(armR, 1, 26, 1, 0, -12, -2, P.wood);
  box(armR, 3, 4, 1, 0, 14, -2, art(['.i.', 'iii', 'iii', '.i.'], { i: P.iron, '.': null }));
  box(g, 8, 8, 8, 0, 20, 0, {
    front: art(['hhhhhhhh', 'hssssssh', 'ssssssss', 'swessews', 'ssssssss', 'sssnnsss', 'ssmmmmss', 'ssssssss'],
      { h: P.hairBrown, s: P.skin, w: '#ffffff', e: '#2b4fa0', n: '#c48f63', m: '#8a4b3a' }),
    side: topRows(3, P.hairBrown, P.skin), back: topRows(6, P.hairBrown, P.skin), top: P.hairBrown, bottom: P.skin,
  });
  sw.push([legL, 'x', 0.7, 0], [legR, 'x', 0.7, Math.PI], [armL, 'x', 0.5, Math.PI], [armR, 'x', 0.2, 0]);
  return { g, sw };
}

function stoneGolem() {
  const g = new THREE.Group(), sw = [];
  const legL = limb(g, 5, 9, 5, -3.5, 9, 0, P.stone), legR = limb(g, 5, 9, 5, 3.5, 9, 0, P.stone);
  box(g, 14, 12, 8, 0, 9, 0, P.stone);
  box(g, 10, 2, 6, 0, 21, 0, P.stone);
  const armL = limb(g, 4, 16, 4, -9, 21, 0, P.stone), armR = limb(g, 4, 16, 4, 9, 21, 0, P.stone);
  box(g, 8, 7, 7, 0, 22, 1.5, {
    front: art(['gggggggg', 'gggggggg', 'gddggddg', 'gcEggEcg', 'gggggggg', 'gggnnggg', 'gggnnggg'],
      { g: P.stone, d: '#4e4e4e', c: '#3a3a3a', E: '!#7ff3ff', n: '#6e6e6e' }),
    all: P.stone,
  });
  // a small flower on the head
  box(g, 1, 3, 1, 1.5, 29, 1, solid('#3f8a28'));
  box(g, 3, 1, 3, 1.5, 32, 1, art(['rrr', 'ryr', 'rrr'], { r: '#e8302c', y: '#f5d142' }));
  sw.push([legL, 'x', 0.45, 0], [legR, 'x', 0.45, Math.PI], [armL, 'x', 0.35, Math.PI], [armR, 'x', 0.35, 0]);
  return { g, sw };
}

function monk() {
  const g = new THREE.Group(), sw = [];
  const hem = bottomRows(1, solid('#4e3822'), P.robe);
  const skirt = new THREE.Group(); g.add(skirt);
  box(skirt, 10, 12, 6, 0, 0, 0, hem);
  box(g, 8, 8, 4, 0, 12, 0, P.robe);
  box(g, 9, 1, 5, 0, 12, 0, P.rope);
  box(g, 1, 5, 1, -2, 7, 2.6, P.rope);
  const sleeve = bottomRows(2, P.skin, P.robe);
  const armL = limb(g, 3, 9, 3, -5.5, 20, 0, sleeve), armR = limb(g, 3, 9, 3, 5.5, 20, 0, sleeve);
  armR.rotation.x = -0.9;
  // Lantern
  const lan = pivot(armR, 0, -9, 0);
  box(lan, 1, 2, 1, 0, -2, 0, P.darkIron);
  box(lan, 4, 1, 4, 0, -3, 0, P.darkIron);
  box(lan, 4, 1, 4, 0, -8, 0, P.darkIron);
  box(lan, 3, 4, 3, 0, -7, 0, art(['dyyd', 'yyyy', 'yyyy', 'dyyd'], { d: '#2c2c32', y: ['!#ffd66b', '!#ffc13a'] }));
  lan.rotation.x = 0.9;
  box(g, 8, 8, 8, 0, 20, 0, {
    front: art(['dddddddd', 'dsssssss', 'ssssssss', 'swkssksw', 'ssssssss', 'sssnnsss', 'sssmmsss', 'ssssssss'],
      { d: '#9c7a5c', s: P.skin, w: '#ffffff', k: '#3a2a1a', n: '#c48f63', m: '#8a4b3a' }),
    all: P.skin,
  });
  // Hood
  const hood = noise(['#5e4430', '#54402c', '#67492f'], 40);
  box(g, 10, 2, 10, 0, 28, -0.5, hood);
  box(g, 1, 8, 9, -4.5, 20, -0.5, hood);
  box(g, 1, 8, 9, 4.5, 20, -0.5, hood);
  box(g, 10, 9, 1, 0, 19, -4.5, hood);
  sw.push([armL, 'x', 0.4, Math.PI], [skirt, 'z', 0.04, 0]);
  return { g, sw };
}

function knight() {
  const g = new THREE.Group(), sw = [];
  // Horse
  const legs = [[-2.5, 5.5, 0], [2.5, 5.5, Math.PI], [-2.5, -5.5, Math.PI], [2.5, -5.5, 0]].map(([x, z, ph]) => {
    const l = limb(g, 3, 10, 3, x, 10, z, bottomRows(2, solid('#2b1a0c'), P.horse));
    sw.push([l, 'x', 0.6, ph]);
    return l;
  });
  box(g, 8, 8, 16, 0, 10, 0, P.horse);
  box(g, 5, 10, 5, 0, 14, 7.5, P.horse, { rx: 0.35 });
  box(g, 1, 9, 3, 0, 16, 5.6, P.mane, { rx: 0.35 });
  box(g, 5, 5, 9, 0, 21, 10.5, {
    side: art(['hhhhhhhhh', 'hhhhhkhhh', 'hhhhhhhhh', 'hhhhhhhhh', 'hhhhhhhhh'], { h: P.horse, k: '#111111' }),
    front: art(['hhhhh', 'hhhhh', 'hhhhh', 'nhhhn', 'hhhhh'], { h: P.horse, n: '#3a2414' }),
    all: P.horse,
  });
  box(g, 1, 2, 1, -1.5, 26, 7.5, P.horse);
  box(g, 1, 2, 1, 1.5, 26, 7.5, P.horse);
  box(g, 2, 8, 2, 0, 10, -8.5, P.mane, { rx: -0.35 });
  box(g, 10, 1, 7, 0, 18, -1, art(['bbbbbbbbbb', 'bwwwwwwwwb', 'bwbbbbbbwb', 'bwbbbbbbwb', 'bwbbbbbbwb', 'bwwwwwwwwb', 'bbbbbbbbbb'],
    { b: P.tunic, w: '#e8e8e8' }, P.tunic));
  // Rider
  box(g, 3, 7, 3, -5.5, 13, -1, P.darkIron);
  box(g, 3, 7, 3, 5.5, 13, -1, P.darkIron);
  box(g, 10, 2, 4, 0, 18, -1, P.darkIron);
  box(g, 7, 8, 4, 0, 19, -1, {
    front: art(['iiiiiii', 'iwwrwwi', 'iwrrrwi', 'iwwrwwi', 'iwwrwwi', 'iwwwwwi', 'iiiiiii', 'iiiiiii'],
      { i: P.iron, w: '#e8e8e8', r: '#3b5fa8' }),
    all: P.iron,
  });
  const armL = limb(g, 3, 8, 3, -5, 27, -1, P.iron), armR = limb(g, 3, 8, 3, 5, 27, -1, P.iron);
  armR.rotation.x = -0.6;
  box(armL, 1, 7, 6, -2, -8, 0, art(['bbbbbb', 'bwwwwb', 'bwbbwb', 'bwbbwb', 'bwwwwb', 'bbwwbb', '.bbbb.'],
    { b: P.tunic, w: '#f5d142', '.': null }, P.iron));
  box(armR, 1, 18, 1, 0, -12, 1, P.iron);
  box(armR, 3, 1, 1, 0, -2, 1, P.gold);
  box(g, 7, 7, 7, 0, 27, -1, {
    front: art(['iiiiiii', 'iiiiiii', 'kkkkkkk', 'iiiiiii', 'iikkkii', 'iiiiiii', 'iiiiiii'], { i: P.iron, k: '#1c1c1c' }),
    all: P.iron,
  });
  box(g, 2, 4, 5, 0, 34, -1.5, P.red);
  sw.push([armL, 'x', 0.15, 0]);
  return { g, sw };
}

function mage() {
  const g = new THREE.Group(), sw = [];
  const hem = (x, y, w, h) => (y >= h - 2 ? P.gold(x, y) : P.purple(x, y));
  const skirt = new THREE.Group(); g.add(skirt);
  box(skirt, 10, 10, 7, 0, 0, 0, hem);
  box(g, 8, 9, 4, 0, 10, 0, {
    front: art(['pppggppp', 'ppggggpp', 'pppggppp', 'pppppppp', 'pppppppp', 'pppppppp', 'pppppppp', 'gggggggg', 'pppppppp'],
      { p: P.purple, g: P.gold }),
    all: P.purple,
  });
  const sleeve = bottomRows(2, P.skin, P.purple);
  const armL = limb(g, 3, 9, 3, -5.5, 19, 0, sleeve), armR = limb(g, 3, 9, 3, 5.5, 19, 0, sleeve);
  armR.rotation.x = -0.3;
  box(armR, 1, 28, 1, 0, -14, 1.5, P.wood);
  box(armR, 3, 5, 3, 0, 14, 1.5, art(['.cc.', 'cCCc', 'cCCc', 'cCCc', '.cc.'], { c: '!#4fe3ff', C: '!#c8fbff', '.': null }, G('#4fe3ff')));
  box(g, 8, 10, 1, 0, 15, -4.5, P.hairGold);
  box(g, 8, 8, 8, 0, 19, 0, {
    front: art(['hhhhhhhh', 'hhsssshh', 'hssssssh', 'hwessewh', 'hssssssh', 'hssnnssh', 'hssmmssh', 'hssssssh'],
      { h: P.hairGold, s: P.skin, w: '#ffffff', e: '#2fa86a', n: '#d39a6c', m: '#c0504d' }),
    side: topRows(2, P.hairGold, (x, y) => (x > 4 ? P.hairGold(x, y) : P.skin(x, y))),
    back: P.hairGold, top: P.hairGold, bottom: P.skin,
  });
  box(g, 9, 1, 9, 0, 26, 0, P.gold);
  box(g, 1, 3, 1, 0, 27, 4, G('#c8fbff'));
  box(g, 1, 2, 1, -3, 27, 4, P.gold);
  box(g, 1, 2, 1, 3, 27, 4, P.gold);
  sw.push([armL, 'x', 0.4, Math.PI], [armR, 'x', 0.15, 0], [skirt, 'z', 0.04, 0]);
  return { g, sw };
}

function elder() {
  const g = new THREE.Group(), sw = [];
  const fur = speck(P.white, '#222222', 6, 41);
  const robeFront = (x, y, w) => (x >= w / 2 - 1 && x <= w / 2 ? fur(x, y) : P.red(x, y));
  const skirt = new THREE.Group(); g.add(skirt);
  box(skirt, 10, 12, 6, 0, 0, 0, { front: robeFront, all: P.red });
  box(g, 9, 9, 5, 0, 12, 0, { front: robeFront, all: P.red });
  box(g, 10, 2, 6, 0, 19, 0, fur);
  const sleeve = bottomRows(2, P.oldSkin, bottomRows(4, fur, P.red));
  const armL = limb(g, 4, 9, 4, -6.5, 20, 0, sleeve), armR = limb(g, 4, 9, 4, 6.5, 20, 0, sleeve);
  armL.rotation.x = -0.5;
  box(armL, 1, 14, 1, 0, -10, 1.5, P.gold);
  box(armL, 3, 3, 3, 0, 4, 1.5, art(['ggg', 'grg', 'ggg'], { g: P.gold, r: '!#ff3b3b' }));
  box(g, 8, 8, 8, 0, 21, 0, {
    front: art(['wwwwwwww', 'wssssssw', 'wwwsswww', 'skesseks', 'ssssssss', 'sssnnsss', 'ssssssss', 'ssssssss'],
      { w: P.white, s: P.oldSkin, k: '#ffffff', e: '#4a6ea8', n: '#c08a6a' }, P.oldSkin),
    side: topRows(4, P.white, P.oldSkin), back: P.white, top: P.white, bottom: P.oldSkin,
  });
  box(g, 6, 7, 1, 0, 17, 4.5, art(['wwwwww', 'ww..ww', 'wwwwww', 'wwwwww', '.wwww.', '.wwww.', '..ww..'], { w: P.white, '.': null }));
  box(g, 9, 2, 9, 0, 29, 0, art(['ggggggggg', 'gggrgrggg'], { g: P.gold, r: '!#ff3b3b' }, P.gold));
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4], [0, 4], [0, -4], [-4, 0], [4, 0]]) box(g, 1, 2, 1, x, 31, z, P.gold);
  sw.push([armR, 'x', 0.4, 0], [skirt, 'z', 0.04, 0]);
  return { g, sw };
}

// ================= BLACK: the Cave Folk =================

function boneWarrior() {
  const g = new THREE.Group(), sw = [];
  const legL = limb(g, 2, 10, 2, -2, 10, 0, P.bone), legR = limb(g, 2, 10, 2, 2, 10, 0, P.bone);
  box(g, 6, 2, 3, 0, 10, 0, P.bone);
  box(g, 2, 9, 2, 0, 11, -0.5, P.bone);
  const ribs = (x, y, w, h) => (y % 2 === 0 || x === 0 || x === w - 1 ? P.bone(x, y) : null);
  box(g, 8, 7, 4, 0, 13, 0, { side: ribs, top: P.bone, bottom: P.bone });
  const armL = limb(g, 2, 10, 2, -5, 20, 0, P.bone), armR = limb(g, 2, 10, 2, 5, 20, 0, P.bone);
  armR.rotation.x = -0.8;
  box(armR, 1, 12, 2, 0, -10, 1, N(['#9a9a9a', '#8a6a52', '#7a7a7a'], 50));
  box(armR, 4, 1, 2, 0, -11, 1, P.rust);
  box(armL, 1, 6, 6, -1.5, -9, 0, art(['.rrrr.', 'rwwwwr', 'rwrrwr', 'rwrrwr', 'rwwwwr', '.rrrr.'], { r: P.rust, w: P.wood, '.': null }));
  box(g, 7, 7, 7, 0, 20, 0, {
    front: art(['bbbbbbb', 'bbbbbbb', 'bkkbkkb', 'bkRbkRb', 'bbbkbbb', 'btbtbtb', 'bbbbbbb'],
      { b: P.bone, k: '#1a1a1a', R: '!#ff4a2a', t: '#2a2a2a' }),
    all: P.bone,
  });
  box(g, 8, 3, 8, 0, 25, 0, P.rust);
  box(g, 2, 4, 2, -5, 26, 0, P.bone, { rz: 0.6 });
  box(g, 2, 4, 2, 5, 26, 0, P.bone, { rz: -0.6 });
  sw.push([legL, 'x', 0.7, 0], [legR, 'x', 0.7, Math.PI], [armL, 'x', 0.5, 0]);
  return { g, sw };
}

function obsidianColossus() {
  const g = new THREE.Group(), sw = [];
  const legL = limb(g, 5, 9, 5, -3.5, 9, 0, P.obsidian), legR = limb(g, 5, 9, 5, 3.5, 9, 0, P.obsidian);
  box(g, 14, 12, 8, 0, 9, 0, P.obsidian);
  box(g, 6, 6, 1, 0, 13, 4.2, art(['.mmmm.', 'mMMMMm', 'mMyyMm', 'mMyyMm', 'mMMMMm', '.mmmm.'],
    { m: '!#c2410c', M: '!#ff7a1a', y: '!#ffd166', '.': null }));
  const armL = limb(g, 5, 15, 5, -9.5, 21, 0, P.obsidian), armR = limb(g, 5, 15, 5, 9.5, 21, 0, P.obsidian);
  box(g, 6, 3, 6, -9.5, 20, 0, P.obsidian);
  box(g, 6, 3, 6, 9.5, 20, 0, P.obsidian);
  box(g, 8, 7, 7, 0, 21, 1, {
    front: art(['oooooooo', 'oooooooo', 'oMMooMMo', 'oyMooMyo', 'oooooooo', 'ommmmmmo', 'oooooooo'],
      { o: P.obsidian, M: '!#ff7a1a', y: '!#ffd166', m: '!#c2410c' }),
    all: P.obsidian,
  });
  box(g, 2, 4, 2, -3, 28, 1, P.obsidian);
  box(g, 2, 3, 2, 3, 28, 1, P.obsidian);
  sw.push([legL, 'x', 0.45, 0], [legR, 'x', 0.45, Math.PI], [armL, 'x', 0.35, Math.PI], [armR, 'x', 0.35, 0]);
  return { g, sw };
}

function shroomShaman() {
  const g = new THREE.Group(), sw = [];
  const legL = limb(g, 3, 6, 3, -2, 6, 0, P.leather), legR = limb(g, 3, 6, 3, 2, 6, 0, P.leather);
  box(g, 9, 9, 5, 0, 6, 0, P.mossRobe);
  const sleeve = bottomRows(2, P.fungusSkin, P.mossRobe);
  const armL = limb(g, 3, 8, 3, -6, 15, 0, sleeve), armR = limb(g, 3, 8, 3, 6, 15, 0, sleeve);
  armR.rotation.x = -0.4;
  box(armR, 1, 22, 1, 0, -10, 1.5, N(['#3d2b1c', '#4a3524'], 51));
  box(armR, 3, 2, 3, 0, 12, 1.5, art(['ccc', 'cwc'], { c: '!#2fd3c4', w: '!#e8fff9' }, G('#2fd3c4')));
  box(g, 7, 6, 7, 0, 15, 0.5, {
    front: art(['fffffff', 'fffffff', 'fGfffGf', 'fffffff', 'ffkkkff', 'fffffff'],
      { f: P.fungusSkin, G: '!#7dff5a', k: '#55503f' }),
    all: P.fungusSkin,
  });
  const cap = (x, y) => (hash(x, y, 52) % 11 === 0 ? '!#bffff4' : N(['#1f8f86', '#25a89d', '#1a7a72', '#187068'], 53)(x, y));
  const gills = (x) => (x % 2 ? '#c9c2a8' : '#a39c84');
  box(g, 13, 3, 13, 0, 21, 0.5, { all: cap, bottom: gills });
  box(g, 9, 2, 9, 0, 24, 0.5, cap);
  box(g, 5, 1, 5, 0, 26, 0.5, cap);
  sw.push([legL, 'x', 0.7, 0], [legR, 'x', 0.7, Math.PI], [armL, 'x', 0.5, Math.PI]);
  return { g, sw };
}

function spiderRider() {
  const g = new THREE.Group(), sw = [];
  const stripes = (x, y) => (y % 3 === 0 ? '#4a3a7a' : P.spider(x, y));
  box(g, 11, 8, 11, 0, 6, -5.5, { all: stripes, top: P.spider });
  box(g, 7, 5, 6, 0, 6, 2, P.spider);
  box(g, 6, 5, 5, 0, 6, 7, {
    front: art(['ssssss', 'sGsGss', 'ssGsGs', 'ssssss', 'sfssfs'], { s: P.spider, G: '!#7dff5a', f: '#d8d2c0' }),
    all: P.spider,
  });
  [[4.5, 0.6], [2.6, 0.2], [0.8, -0.2], [-1, -0.6]].forEach(([z, a], n) => {
    for (const side of [-1, 1]) {
      const p = pivot(g, side * 3.5, 9, z);
      p.rotation.y = side * a + (side < 0 ? Math.PI : 0);
      box(p, 7, 2, 2, 3.5, 0, 0, P.spider, { rz: 0.45 });
      box(p, 2, 11, 2, 7, -9, 0, P.spider);
      sw.push([p, 'z', 0.25, (n % 2 ? Math.PI : 0) + (side > 0 ? 0 : Math.PI)]);
    }
  });
  // The goblin rider
  box(g, 2, 5, 2, -4, 10, 1, P.leather);
  box(g, 2, 5, 2, 4, 10, 1, P.leather);
  box(g, 7, 2, 4, 0, 14, 1, P.leather);
  box(g, 6, 7, 4, 0, 15, 1, P.leather);
  const armL = limb(g, 2, 7, 2, -4, 22, 1, bottomRows(2, P.goblin, P.leather));
  const armR = limb(g, 2, 7, 2, 4, 22, 1, bottomRows(2, P.goblin, P.leather));
  armR.rotation.x = -0.7;
  box(armR, 1, 16, 1, 0, -10, 1, P.wood);
  box(armR, 3, 3, 1, 0, 6, 1, art(['r..', 'rr.', '.rr'], { r: P.rust, '.': null }));
  box(g, 7, 6, 6, 0, 22, 1, {
    front: art(['ggggggg', 'ggggggg', 'gYgggYg', 'ggggggg', 'gkkkkkg', 'ggtgtgg'], { g: P.goblin, Y: '!#ffe14a', k: '#2a3a1a', t: '#f2f2f2' }),
    all: P.goblin,
  });
  box(g, 3, 2, 1, -5, 25, 1, P.goblin);
  box(g, 3, 2, 1, 5, 25, 1, P.goblin);
  box(g, 8, 3, 7, 0, 27, 0.5, P.leather);
  box(g, 8, 6, 1, 0, 22, -2.5, P.leather);
  sw.push([armL, 'x', 0.3, 0]);
  return { g, sw };
}

function shadowWitch() {
  const g = new THREE.Group(), sw = [];
  const trim = (x, y, w, h) => {
    if (y >= h - 3 && hash(x, y, 54) % 3 === 0) return null;
    return y === 0 ? '#9b4dff' : P.night(x, y);
  };
  const skirt = new THREE.Group(); g.add(skirt);
  box(skirt, 10, 12, 8, 0, 2, 0, { side: trim, top: P.night, bottom: P.night });
  box(g, 8, 8, 4, 0, 14, 0, {
    front: art(['pnnnnnnp', 'npnnnnpn', 'nnpnnpnn', 'nnnppnnn', 'nnnppnnn', 'nnnnnnnn', 'nnnnnnnn', 'pppppppp'],
      { p: '!#9b4dff', n: P.night }),
    all: P.night,
  });
  const sleeve = bottomRows(2, P.pale, P.night);
  const armL = limb(g, 3, 9, 3, -5.5, 22, 0, sleeve), armR = limb(g, 3, 9, 3, 5.5, 22, 0, sleeve);
  armR.rotation.x = -1.1;
  armL.rotation.x = -0.2;
  box(g, 9, 3, 6, 0, 21, -1, P.night);
  box(g, 8, 12, 1, 0, 16, -4.5, P.black);
  box(g, 8, 8, 8, 0, 22, 0, {
    front: art(['kkkkkkkk', 'kssssssk', 'kssssssk', 'kPksskPk', 'kssssssk', 'kssssssk', 'kssmmssk', 'kssssssk'],
      { k: P.black, s: P.pale, P: '!#c77dff', m: '#5a2a5a' }, P.pale),
    side: (x, y) => (x > 3 || y < 2 ? P.black(x, y) : P.pale(x, y)),
    back: P.black, top: P.black, bottom: P.pale,
  });
  [-3, -1.5, 0, 1.5, 3].forEach((x, n) => box(g, 1, 3 + (n % 2), 1, x, 30, 3.5 - Math.abs(x) * 0.3, art(['p', 'k', 'k', 'k'], { p: '!#c77dff', k: P.black })));
  const orb = pivot(g, 5.5, 14, 9);
  box(orb, 4, 4, 4, 0, 0, 0, art(['.pp.', 'pPPp', 'pPPp', '.pp.'], { p: '!#9b4dff', P: '!#e0b3ff', '.': null }, G('#9b4dff')));
  sw.push([armL, 'x', 0.3, 0], [skirt, 'z', 0.06, 0]);
  return { g, sw, hover: 1.2, orb };
}

function caveKing() {
  const g = new THREE.Group(), sw = [];
  const ember = speck(P.plate, '!#ff6a00', 6, 55);
  const legL = limb(g, 4, 10, 4, -2.5, 10, 0, P.plate), legR = limb(g, 4, 10, 4, 2.5, 10, 0, P.plate);
  box(g, 10, 11, 5, 0, 10, 0, {
    front: art(['pppppppppp', 'pppEEEEppp', 'ppEppppEpp', 'pppEEEEppp', 'pppppppppp', 'pppppppppp', 'pppppppppp', 'gggggggggg', 'pppppppppp', 'pppppppppp', 'pppppppppp'],
      { p: P.plate, E: '!#ff6a00', g: P.gold }),
    all: ember,
  });
  box(g, 10, 17, 1, 0, 6, -3.2, P.cape);
  const armL = limb(g, 4, 10, 4, -7, 21, 0, P.plate), armR = limb(g, 4, 10, 4, 7, 21, 0, P.plate);
  armL.rotation.x = -0.7; armR.rotation.x = -0.7;
  box(g, 6, 3, 6, -7, 20, 0, ember);
  box(g, 6, 3, 6, 7, 20, 0, ember);
  // A great sword, held with both hands
  const sword = pivot(g, 0, 0, 7);
  box(sword, 2, 15, 1, 0, 0, 0, N(['#2a2a33', '#33333e', '#3c3c48'], 56));
  box(sword, 1, 13, 1.2, 0, 1, 0, G('#ff6a00'));
  box(sword, 7, 1, 2, 0, 15, 0, P.gold);
  box(sword, 1, 4, 1, 0, 16, 0, P.leather);
  box(g, 8, 8, 8, 0, 21, 0, {
    front: art(['cccccccc', 'cccccccc', 'cEEccEEc', 'cYEccEYc', 'cccccccc', 'cccccccc', 'cmmmmmmc', 'cccccccc'],
      { c: P.charcoal, E: '!#ff8a1c', Y: '!#ffd166', m: '!#ff4a00' }),
    all: P.charcoal,
  });
  box(g, 9, 3, 9, 0, 29, 0, art(['ooooooooo', 'oooRoRooo', 'ooooooooo'], { o: P.black, R: '!#ff5a00' }, P.black));
  for (const [x, z, h] of [[-4, 4, 4], [0, 4, 6], [4, 4, 4], [-4, -4, 3], [4, -4, 3]]) box(g, 1, h, 1, x, 32, z, P.black);
  box(g, 1, 1, 1, 0, 38, 4, G('#ff5a00'));
  sw.push([legL, 'x', 0.6, 0], [legR, 'x', 0.6, Math.PI]);
  return { g, sw };
}

// ---------- What other files use ----------
export const ROSTER = {
  w: {
    p: ['Villager', villager], r: ['Stone Golem', stoneGolem], b: ['Lantern Monk', monk],
    n: ['Block Horse Knight', knight], q: ['Crystal Mage', mage], k: ['Village Elder', elder],
  },
  b: {
    p: ['Bone Warrior', boneWarrior], r: ['Obsidian Colossus', obsidianColossus], b: ['Mushroom Shaman', shroomShaman],
    n: ['Spider Rider', spiderRider], q: ['Shadow Witch', shadowWitch], k: ['Cave King', caveKing],
  },
};
export const PIECE_NAMES = { p: 'Pawn', r: 'Rook', b: 'Bishop', n: 'Knight', q: 'Queen', k: 'King' };

// ---------- Fewer draw calls ----------
// A figure is built from many small boxes, and every box face has a little
// texture of its own: drawn as built, the whole board needs more than 5000
// draw calls per frame. That is too much for some graphics chips; the
// browser then switches the 3D view off and only the blue page background
// stays. So, once per kind of piece, all its face textures are copied onto
// one sheet (an "atlas"), and all fixed boxes of one part (the body, an arm,
// a leg ...) become a single mesh with that sheet. Parts that move keep
// their own group. The look stays exactly the same.
const PAD = 2; // edge pixels repeated around each texture, so neighbours never bleed in
const kinds = new Map(); // color + type -> { material, rects, shapes }

function sheetTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Copies an image with its edge pixels repeated PAD times around it. */
function paste(ctx, img, x, y) {
  const w = img.width, h = img.height;
  ctx.drawImage(img, x, y);
  ctx.drawImage(img, 0, 0, w, 1, x, y - PAD, w, PAD);
  ctx.drawImage(img, 0, h - 1, w, 1, x, y + h, w, PAD);
  ctx.drawImage(img, 0, 0, 1, h, x - PAD, y, PAD, h);
  ctx.drawImage(img, w - 1, 0, 1, h, x + w, y, PAD, h);
}

/** One sheet with all face textures of a kind of piece, and the place of each. */
function buildSheet(mats) {
  const items = mats.map((m) => ({ m, img: m.map.image, glow: m.emissiveMap ? m.emissiveMap.image : null }));
  items.sort((a, b) => b.img.height - a.img.height);
  const W = 256;
  let x = 0, y = 0, row = 0;
  for (const it of items) {
    const w = it.img.width + 2 * PAD, h = it.img.height + 2 * PAD;
    if (x + w > W) {
      x = 0;
      y += row;
      row = 0;
    }
    it.x = x + PAD;
    it.y = y + PAD;
    x += w;
    row = Math.max(row, h);
  }
  const H = y + row;
  const colour = document.createElement('canvas');
  colour.width = W;
  colour.height = H;
  const ctx = colour.getContext('2d');
  const anyGlow = items.some((it) => it.glow);
  let glowCtx = null, glow = null;
  if (anyGlow) {
    glow = document.createElement('canvas');
    glow.width = W;
    glow.height = H;
    glowCtx = glow.getContext('2d');
    glowCtx.fillStyle = '#000';
    glowCtx.fillRect(0, 0, W, H);
  }
  const rects = new Map();
  for (const it of items) {
    paste(ctx, it.img, it.x, it.y);
    if (it.glow) paste(glowCtx, it.glow, it.x, it.y);
    rects.set(it.m, { x: it.x / W, y: it.y / H, w: it.img.width / W, h: it.img.height / H });
  }
  const material = new THREE.MeshLambertMaterial({
    map: sheetTexture(colour),
    alphaTest: mats.some((m) => m.alphaTest > 0) ? 0.5 : 0,
  });
  if (glow) {
    material.emissiveMap = sheetTexture(glow);
    material.emissive = new THREE.Color('#ffffff');
  }
  return { material, rects };
}

/** All fixed boxes of one part as one shape, with the texture places of the sheet. */
function joinBoxes(boxes, rects) {
  const pos = [], nor = [], uv = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const b of boxes) {
    b.updateMatrix();
    nm.getNormalMatrix(b.matrix);
    const geo = b.geometry;
    const idx = geo.index.array;
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
    for (const grp of geo.groups) {
      const r = rects.get(b.material[grp.materialIndex]);
      for (let i = grp.start; i < grp.start + grp.count; i++) {
        const v = idx[i];
        p.fromBufferAttribute(P, v).applyMatrix4(b.matrix);
        n.fromBufferAttribute(N, v).applyMatrix3(nm).normalize();
        pos.push(p.x, p.y, p.z);
        nor.push(n.x, n.y, n.z);
        // The canvas is turned upside down when it becomes a texture (v = 0 is its bottom row).
        uv.push(r.x + U.getX(v) * r.w, 1 - (r.y + (1 - U.getY(v)) * r.h));
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

/** Joins the fixed boxes of every part of a figure; key names the kind of piece. */
function mergeFigure(root, keep, key) {
  const parts = [];
  const boxesOf = [];
  root.traverse((o) => {
    if (o.isMesh) return;
    parts.push(o);
    boxesOf.push(o.children.filter((c) => c.isMesh && !keep.has(c) && Array.isArray(c.material)));
  });
  if (!kinds.has(key)) {
    const mats = [];
    for (const boxes of boxesOf) for (const b of boxes) for (const m of b.material) if (!mats.includes(m)) mats.push(m);
    kinds.set(key, { ...buildSheet(mats), shapes: [] });
  }
  const kind = kinds.get(key);
  parts.forEach((part, partNo) => {
    const boxes = boxesOf[partNo];
    if (!boxes.length) return;
    if (!kind.shapes[partNo]) kind.shapes[partNo] = joinBoxes(boxes, kind.rects);
    for (const b of boxes) part.remove(b);
    const mesh = new THREE.Mesh(kind.shapes[partNo], kind.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    part.add(mesh);
  });
}

export function createPiece(type, color) {
  const [name, build] = ROSTER[color][type];
  const { g, sw, hover = 0, orb } = build();
  mergeFigure(g, new Set([...sw.map((s) => s[0]), orb]), color + type);
  g.scale.setScalar(S);
  const outer = new THREE.Group();
  outer.add(g);
  outer.rotation.y = color === 'w' ? Math.PI : 0;
  outer.userData = {
    type, color, name, figure: g, hover: hover * S, orb, walking: 0,
    swing: sw.map(([obj, axis, amp, phase]) => ({ obj, axis, amp, phase, base: obj.rotation[axis] })),
    seed: Math.random() * 10,
  };
  g.traverse((o) => { o.userData.pieceRoot = outer; });
  return outer;
}

// Animation: walking (walking 0..1) and a little bobbing while standing
export function animatePiece(p, t) {
  const u = p.userData;
  const w = u.walking;
  const ph = t * 11 + u.seed;
  for (const s of u.swing) {
    const idle = Math.sin(t * 1.6 + u.seed + s.phase) * 0.04;
    s.obj.rotation[s.axis] = s.base + Math.sin(ph + s.phase) * s.amp * w + idle * (1 - w);
  }
  if (u.hover) u.figure.position.y = u.hover + Math.sin(t * 2 + u.seed) * 0.05;
  if (u.orb) u.orb.position.y = 14 + Math.sin(t * 3 + u.seed) * 1.5;
}
