// Millpond – the two figures: the ladybug (a red shell with black dots in
// two halves that open, wings underneath, a black head with friendly eyes)
// and the snail (a soft foot, eyes on stalks and a honey-coloured shell that
// curls up on its back). Both are round low-poly shapes. The fixed parts of
// a figure are joined into one shape with its colours painted on its
// corners, so a figure needs only a few draw calls. Every figure looks
// along +z and stands on y = 0; it is about 0.6 m long.

import * as THREE from './vendor/three.module.js';

/**
 * Joins parts into one shape with corner colours. A part is { geo, color },
 * { geo, paint(x, y, z) -> colour } (one colour per triangle), { geo,
 * paintCorners(x, y, z) } (every corner its own colour, for soft round
 * spots) or a shape that already has its colours.
 */
function joinParts(parts) {
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      // One colour per triangle, taken at its middle: clean low-poly patches.
      const mx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      const my = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
      const mz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      const own = g.attributes.color;
      if (!own) c.set(part.paint ? part.paint(mx, my, mz) : part.color);
      for (let k = 0; k < 3; k++) {
        pos.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
        if (own) col.push(own.getX(i), own.getY(i), own.getZ(i));
        else if (part.paintCorners) {
          const cc = new THREE.Color(part.paintCorners(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
          col.push(cc.r, cc.g, cc.b);
        } else col.push(c.r, c.g, c.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A shape moved, turned and scaled (a helper for building figures). */
function shaped(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const g = geo.clone();
  g.scale(sx, sy, sz);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** A thin stick from point a to point b. */
function stick(a, b, radius) {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.applyQuaternion(q);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

const BLACK = '#26201c';
const WHITE = '#fbf7ee';

// ---- The ladybug ---------------------------------------------------------------

const SHELL_RED = '#d8362b';
const SHELL_Y = 0.13;
/** Where the black dots sit on the shell (directions from its middle). */
const DOTS = [
  [0.45, 0.75, 0.35],
  [0.55, 0.55, -0.35],
  [0.25, 0.9, -0.05],
  [0.6, 0.35, 0.05],
].map((d) => new THREE.Vector3(...d).normalize());

function ladybugBase() {
  const parts = [];
  // The dark body under the shell.
  parts.push({ geo: shaped(new THREE.SphereGeometry(0.25, 12, 6), { y: 0.11, sy: 0.45, sz: 1.15 }), color: BLACK });
  // Head, eyes and a little smile line.
  parts.push({ geo: shaped(new THREE.SphereGeometry(0.13, 12, 8), { y: 0.13, z: 0.29, sy: 0.85 }), color: BLACK });
  for (const s of [-1, 1]) {
    parts.push({ geo: shaped(new THREE.SphereGeometry(0.048, 8, 6), { x: s * 0.06, y: 0.17, z: 0.38 }), color: WHITE });
    parts.push({ geo: shaped(new THREE.SphereGeometry(0.024, 6, 4), { x: s * 0.062, y: 0.172, z: 0.418 }), color: BLACK });
    // Antennae with round tips.
    parts.push({ geo: stick([s * 0.05, 0.22, 0.33], [s * 0.12, 0.33, 0.42], 0.01), color: BLACK });
    parts.push({ geo: shaped(new THREE.SphereGeometry(0.025, 6, 4), { x: s * 0.12, y: 0.33, z: 0.42 }), color: BLACK });
    // Three short legs on each side.
    for (const z of [-0.12, 0.02, 0.16]) parts.push({ geo: stick([s * 0.16, 0.08, z], [s * 0.28, 0.005, z + 0.04], 0.016), color: BLACK });
  }
  return joinParts(parts);
}

/** One half of the shell (side = 1: right, -1: left), with its hinge at the origin of the shape. */
function shellHalf(side) {
  const geo = new THREE.SphereGeometry(0.28, 32, 14, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2);
  geo.scale(1, 0.78, 1.15);
  const n = new THREE.Vector3();
  return joinParts([
    {
      geo,
      paintCorners(x, y, z) {
        if (Math.abs(x) < 0.012) return BLACK; // the seam down the middle
        n.set(Math.abs(x), y, z).normalize();
        return DOTS.some((d) => n.distanceTo(d) < 0.21) ? BLACK : SHELL_RED;
      },
    },
  ]);
}

/** A see-through wing that unfolds when the ladybug flies. */
function wingGeo() {
  const g = new THREE.CircleGeometry(0.2, 10);
  g.scale(0.55, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -0.18);
  return g;
}

// ---- The snail --------------------------------------------------------------------

const FOOT = '#c9b48a';
const SHELL_HONEY = '#e0a64a';
const SHELL_STRIPE = '#a86f2a';

/**
 * The snail's shell: a tube that winds round in a spiral on the snail's
 * back, getting thinner as it curls inwards and up, with a dark band along
 * the tube. Built ring by ring, with its colours on its corners.
 */
function spiralShell() {
  const turns = 3.2 * Math.PI;
  const steps = 60;
  const sides = 10;
  const shrink = 0.16;
  const centre = new THREE.Vector3(0, 0.27, -0.06);
  const path = (t) => {
    const r = 0.13 * Math.exp(-shrink * t);
    return new THREE.Vector3(0, centre.y + Math.sin(t) * r, centre.z - Math.cos(t) * r);
  };
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns;
    const at = path(t);
    const along = path(t + 0.01).sub(at).normalize();
    const side = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(along, side).normalize();
    const radius = 0.125 * Math.exp(-shrink * t) + 0.005;
    const ring = [];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      // A little wider than high, so the shell looks plump from the side.
      ring.push(at.clone().addScaledVector(side, Math.cos(a) * radius * 1.25).addScaledVector(up, Math.sin(a) * radius));
    }
    rings.push(ring);
  }
  const pos = [];
  const col = [];
  const honey = new THREE.Color(SHELL_HONEY);
  const band = new THREE.Color(SHELL_STRIPE);
  const push = (v, c) => {
    pos.push(v.x, v.y, v.z);
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides;
      const c = j === 2 || j === 7 ? band : honey;
      const [a, b, d, e] = [rings[i][j], rings[i + 1][j], rings[i + 1][j2], rings[i][j2]];
      for (const v of [a, d, b, a, e, d]) push(v, c);
    }
  }
  // The opening at the start of the tube is closed with a flat cap.
  const first = rings[0];
  const mid = first.reduce((m, v) => m.add(v), new THREE.Vector3()).multiplyScalar(1 / sides);
  for (let j = 0; j < sides; j++) for (const v of [mid, first[j], first[(j + 1) % sides]]) push(v, band);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

function snailGeo() {
  const parts = [];
  // The soft foot, longer than the shell, with the head rising at the front.
  const foot = new THREE.CapsuleGeometry(0.1, 0.42, 4, 10);
  foot.rotateX(Math.PI / 2);
  parts.push({ geo: shaped(foot, { y: 0.07, sy: 0.6, sx: 1.25 }), color: FOOT });
  parts.push({ geo: shaped(new THREE.SphereGeometry(0.11, 10, 8), { y: 0.15, z: 0.3 }), color: FOOT });
  for (const s of [-1, 1]) {
    // Eye stalks with big friendly eyes.
    parts.push({ geo: stick([s * 0.04, 0.2, 0.33], [s * 0.08, 0.36, 0.37], 0.016), color: FOOT });
    parts.push({ geo: shaped(new THREE.SphereGeometry(0.045, 8, 6), { x: s * 0.08, y: 0.38, z: 0.37 }), color: WHITE });
    parts.push({ geo: shaped(new THREE.SphereGeometry(0.023, 6, 4), { x: s * 0.085, y: 0.385, z: 0.405 }), color: BLACK });
  }
  parts.push({ geo: spiralShell() });
  return joinParts(parts);
}

// ---- Building figures --------------------------------------------------------------

const shapes = {};
/** The shapes are made once and shared by all figures of a kind. */
function getShapes() {
  if (!shapes.base) {
    shapes.base = ladybugBase();
    shapes.left = shellHalf(-1);
    shapes.right = shellHalf(1);
    shapes.wing = wingGeo();
    // All wings share one material (they never glow), so nothing is left over when figures go.
    shapes.wingMat = new THREE.MeshStandardMaterial({ color: '#e8f0ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.3 });
    shapes.snail = snailGeo();
  }
  return shapes;
}

/**
 * A new figure for `side` ('l' ladybug, 's' snail): { root, side, mat,
 * left, right, wings } where left/right are the shell halves and wings the
 * two wings of a ladybug (null for a snail). mat is the figure's own
 * material, so it can glow by itself.
 */
export function createFigure(side) {
  const s = getShapes();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true });
  const root = new THREE.Group();
  const fig = { root, side, mat, left: null, right: null, wings: null };
  const add = (geo, parent = root, m = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  if (side === 's') {
    add(s.snail);
    return fig;
  }
  add(s.base);
  // The shell halves hang on a hinge just behind the head, so they can open.
  for (const k of ['left', 'right']) {
    const hinge = new THREE.Group();
    hinge.position.set(0, SHELL_Y, 0.16);
    const half = add(s[k], hinge);
    half.position.z = -0.16;
    root.add(hinge);
    fig[k] = hinge;
  }
  fig.wings = [-1, 1].map((sgn) => {
    const hinge = new THREE.Group();
    hinge.position.set(sgn * 0.05, SHELL_Y + 0.12, 0.08);
    const w = add(s.wing, hinge, s.wingMat);
    w.position.x = sgn * 0.12;
    w.castShadow = false;
    hinge.visible = false;
    root.add(hinge);
    return hinge;
  });
  return fig;
}

/**
 * Opens a ladybug for flying (open 0 = shut, 1 = wide open); flap moves
 * the wings (a running angle). Snails have nothing to open.
 */
export function setWings(fig, open, flap = 0) {
  if (!fig.wings) return;
  fig.left.rotation.set(-0.55 * open, 0, -0.75 * open);
  fig.right.rotation.set(-0.55 * open, 0, 0.75 * open);
  for (const [i, w] of fig.wings.entries()) {
    w.visible = open > 0.05;
    const sgn = i ? 1 : -1;
    w.rotation.set(0, sgn * (0.3 + 0.5 * open), sgn * Math.sin(flap) * 0.6 * open);
  }
}
