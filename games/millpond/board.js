// Millpond – the board: where each of the 24 points is in the 3D world, the
// wooden board with its lines and pegs, the marks on the points (free
// points, possible moves, the chosen piece, pieces that may be removed, the
// last move) and which point is under the mouse.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { POINT_GRID, NEIGHBOURS } from './rules.js';

const SP = CONFIG.board.spacing;

/** The middle of a point in the world. The Ladybugs sit at +z, the Snails at -z. */
export const pointPos = (p) => new THREE.Vector3((POINT_GRID[p][0] - 3) * SP, 0, (POINT_GRID[p][1] - 3) * SP);

/** The point nearest to world position x, z, or null if none is close enough. */
export function pointAt(x, z) {
  let best = null;
  let bestD = CONFIG.board.pickRadius;
  for (let p = 0; p < 24; p++) {
    const q = pointPos(p);
    const d = Math.hypot(q.x - x, q.z - z);
    if (d < bestD) [best, bestD] = [p, d];
  }
  return best;
}

export function createBoard(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // The wooden board; its top is at height 0, where the pieces stand.
  const size = 6 * SP + 1.3;
  const wood = new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.85 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), wood);
  plate.position.y = -0.15;
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  // The carved lines between neighbouring points.
  const lineMat = new THREE.MeshStandardMaterial({ color: '#5a3a1e', roughness: 1 });
  for (let a = 0; a < 24; a++) {
    for (const b of NEIGHBOURS[a]) {
      if (b < a) continue;
      const pa = pointPos(a);
      const pb = pointPos(b);
      const len = pa.distanceTo(pb);
      const line = new THREE.Mesh(new THREE.BoxGeometry(len + 0.07, 0.01, 0.07), lineMat);
      line.position.set((pa.x + pb.x) / 2, 0.003, (pa.z + pb.z) / 2);
      line.rotation.y = -Math.atan2(pb.z - pa.z, pb.x - pa.x);
      line.receiveShadow = true;
      group.add(line);
    }
  }

  // A little round wooden peg on every point.
  const pegGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.05, 20);
  const pegMat = new THREE.MeshStandardMaterial({ color: '#6b4524', roughness: 0.9 });
  for (let p = 0; p < 24; p++) {
    const peg = new THREE.Mesh(pegGeo, pegMat);
    peg.position.copy(pointPos(p)).setY(0.02);
    peg.receiveShadow = true;
    group.add(peg);
  }

  // The marks: a ring round the point and a dot on it.
  const ringGeo = new THREE.RingGeometry(0.3, 0.4, 32);
  const dotGeo = new THREE.CircleGeometry(0.11, 20);
  const marks = [];
  for (let p = 0; p < 24; p++) {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    for (const m of [ring, dot]) {
      m.rotation.x = -Math.PI / 2;
      m.position.copy(pointPos(p)).setY(0.06);
      m.visible = false;
      group.add(m);
    }
    marks.push({ ring, dot });
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  return {
    /**
     * Shows the marks. s: { free: points that glow while placing,
     * targets: where the chosen piece may go, selected: the chosen point or
     * null, removable: pieces that may be removed, last: points of the last
     * move }
     */
    show({ free = [], targets = [], selected = null, removable = [], last = [] }) {
      for (const m of marks) {
        m.ring.visible = false;
        m.dot.visible = false;
      }
      const ring = (p, colour, opacity) => {
        marks[p].ring.material.color.set(colour);
        marks[p].ring.material.opacity = opacity;
        marks[p].ring.visible = true;
      };
      const dot = (p, colour, opacity) => {
        marks[p].dot.material.color.set(colour);
        marks[p].dot.material.opacity = opacity;
        marks[p].dot.visible = true;
      };
      for (const p of last) ring(p, CONFIG.marks.last, 0.5);
      for (const p of free) dot(p, CONFIG.marks.free, 0.7);
      for (const p of targets) dot(p, CONFIG.marks.target, 0.9);
      if (selected !== null) ring(selected, CONFIG.marks.select, 0.9);
      for (const p of removable) ring(p, CONFIG.marks.remove, 0.9);
    },

    /**
     * The point under the screen position (x, y), or null. Pieces are hit
     * first (their 3D objects carry userData.point), then the board.
     */
    pick(x, y, camera, pieces) {
      ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const onPiece = ray.intersectObjects(pieces, true)[0];
      if (onPiece) {
        let o = onPiece.object;
        while (o && o.userData.point === undefined) o = o.parent;
        if (o) return o.userData.point;
      }
      if (ray.ray.intersectPlane(floor, hit)) return pointAt(hit.x, hit.z);
      return null;
    },
  };
}
