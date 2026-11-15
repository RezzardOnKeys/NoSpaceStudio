import * as THREE from './vendor/three.module.js';
import { shapeHeight } from './arena.js';
// Inkwars – builds the visible arena in a matt studio look: rounded blocks
// like toys on a photo stage. Every surface that can be painted gets a
// material that lays the colour mask over its base colour.
const BEVEL = 0.14;
function paintMaterial(base, tex) {
  const m = new THREE.MeshLambertMaterial({ color: base, map: tex });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      vec4 inkTexel = texture2D( map, vMapUv );
      float inkAmount = smoothstep( 0.42, 0.58, inkTexel.a );
      vec3 inkColor = inkTexel.rgb / max( inkTexel.a, 0.001 );
      float inkRim = smoothstep( 0.42, 0.58, inkTexel.a ) - smoothstep( 0.62, 0.9, inkTexel.a );
      diffuseColor.rgb = mix( diffuseColor.rgb, inkColor * ( 1.0 - 0.18 * inkRim ), inkAmount );
      `,
    );
  };
  m.customProgramCacheKey = () => 'ink';
  return m;
}
function quad(a, b, c, d, ua, ub, uc, ud) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3),
  );
  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([...ua, ...ub, ...uc, ...ua, ...uc, ...ud], 2),
  );
  g.computeVertexNormals();
  return g;
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}
export function buildArenaView(arena, paint) {
  const group = new THREE.Group();
  const topMats = new Map();
  const topMat = (color) => {
    let m = topMats.get(color);
    if (!m) topMats.set(color, (m = paintMaterial(color, paint.texture)));
    return m;
  };
  const fuv = (x, z) => [(x + arena.hw) / arena.W, (z + arena.hd) / arena.D];
  const add = (g, m) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  };
  /** A surface in the top-down colour mask, corners counter-clockwise seen from outside. */
  const floorQuad = (a, b, c, d, color) => {
    add(
      quad(a, b, c, d, fuv(a[0], a[2]), fuv(b[0], b[2]), fuv(c[0], c[2]), fuv(d[0], d[2])),
      topMat(color),
    );
  };
  const top = (x0, x1, z0, z1, hf, color) => {
    floorQuad(
      [x0, hf(x0, z1), z1],
      [x1, hf(x1, z1), z1],
      [x1, hf(x1, z0), z0],
      [x0, hf(x0, z0), z0],
      color,
    );
  };
  // Floor
  top(-arena.hw, arena.hw, -arena.hd, arena.hd, () => 0, 0xf3f1ec);
  // Side face. drop = distance from its top edge to the height of the part (for the bevel).
  const side = (s, face, drop) => {
    const H = (x, z) => shapeHeight(s, x, z) - drop;
    const { x0, x1, z0, z1, y0 } = s;
    const v = drop ? (s.h - drop - y0) / (s.h - y0) : 1;
    if (face === 0)
      return quad(
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, H(x0, z1), z1],
        [x0, H(x0, z0), z0],
        [0, 0],
        [1, 0],
        [1, v],
        [0, v],
      );
    if (face === 1)
      return quad(
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, H(x1, z0), z0],
        [x1, H(x1, z1), z1],
        [1, 0],
        [0, 0],
        [0, v],
        [1, v],
      );
    if (face === 2)
      return quad(
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, H(x0, z0), z0],
        [x1, H(x1, z0), z0],
        [1, 0],
        [0, 0],
        [0, v],
        [1, v],
      );
    return quad(
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, H(x1, z1), z1],
      [x0, H(x0, z1), z1],
      [0, 0],
      [1, 0],
      [1, v],
      [0, v],
    );
  };
  for (const s of arena.shapes) {
    const sideColor = shade(s.color, 0.88);
    if (s.kind === 'box') {
      // The top is inset with a bevel all around, which takes the hard edge off the blocks.
      const b = BEVEL;
      const { x0, x1, z0, z1, h } = s;
      top(x0 + b, x1 - b, z0 + b, z1 - b, () => h, s.color);
      const l = h - b;
      floorQuad([x0, l, z1], [x0 + b, h, z1 - b], [x0 + b, h, z0 + b], [x0, l, z0], s.color);
      floorQuad([x1, l, z0], [x1 - b, h, z0 + b], [x1 - b, h, z1 - b], [x1, l, z1], s.color);
      floorQuad([x0, l, z0], [x0 + b, h, z0 + b], [x1 - b, h, z0 + b], [x1, l, z0], s.color);
      floorQuad([x1, l, z1], [x1 - b, h, z1 - b], [x0 + b, h, z1 - b], [x0, l, z1], s.color);
      for (let face = 0; face < 4; face++)
        add(side(s, face, b), paintMaterial(sideColor, paint.wall(s, face).texture));
    } else {
      top(s.x0, s.x1, s.z0, s.z1, (x, z) => shapeHeight(s, x, z), s.color);
      const m = new THREE.MeshLambertMaterial({ color: sideColor });
      for (let face = 0; face < 4; face++) add(side(s, face, 0), m);
    }
  }
  // Barrier around the arena: white with a coloured rail on top
  const capColors = [0x6fbf73, 0xf08a80, 0x6fbf73, 0xf08a80];
  const T = 1.2;
  const WH = 2.6;
  const walls = [
    [0, -arena.hd - T / 2, arena.W + 2 * T, T],
    [0, arena.hd + T / 2, arena.W + 2 * T, T],
    [-arena.hw - T / 2, 0, T, arena.D],
    [arena.hw + T / 2, 0, T, arena.D],
  ];
  walls.forEach(([x, z, w, d], i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, WH, d),
      new THREE.MeshLambertMaterial({ color: 0xf7f6f2 }),
    );
    mesh.position.set(x, WH / 2 - 0.4, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    const long = w > d;
    const rail = new THREE.Mesh(
      new THREE.CapsuleGeometry(T * 0.62, (long ? w : d) - T, 6, 14),
      new THREE.MeshLambertMaterial({ color: capColors[i] }),
    );
    rail.rotation.set(long ? 0 : Math.PI / 2, 0, long ? Math.PI / 2 : 0);
    rail.position.set(x, WH - 0.4, z);
    rail.castShadow = true;
    group.add(rail);
  });
  // Studio floor and oversized toy shapes as scenery
  const stage = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshLambertMaterial({ color: 0xe6e8ec }),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = -0.4;
  stage.receiveShadow = true;
  group.add(stage);
  const propColors = [0x6fbf73, 0xf08a80, 0xf7f6f2, 0xf0894a, 0x2b2d35];
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + 0.2;
    const rad = 48 + (i % 3) * 9;
    const size = 2.2 + (i % 4) * 0.9;
    const m = new THREE.MeshLambertMaterial({ color: propColors[i % 5] });
    let prop;
    if (i % 3 === 0)
      prop = new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.6, size * 1.4, 6, 16), m);
    else if (i % 3 === 1) prop = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), m);
    else prop = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.4, 12, 24), m);
    prop.position.set(
      Math.cos(ang) * rad * 1.25,
      i % 3 === 2 ? size * 0.4 - 0.4 : size * 0.9 - 0.4,
      Math.sin(ang) * rad,
    );
    if (i % 3 === 2) prop.rotation.x = Math.PI / 2;
    prop.castShadow = true;
    group.add(prop);
  }
  return group;
}
