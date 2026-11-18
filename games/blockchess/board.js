// Blockchess – the squares of the board: where each square is in the 3D
// world, the coloured marks on it (last move, selected piece, possible moves,
// king in check) and which square or piece is under the mouse.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const FILES = 'abcdefgh';

/** The middle of a square ("e4") in the world. White sits at +z. */
export const squarePos = (sq) => new THREE.Vector3(FILES.indexOf(sq[0]) - 3.5, 0, 3.5 - (+sq[1] - 1));

/** The square at world position x, z, or null beside the board. */
export function squareAt(x, z) {
  const f = Math.floor(x + 4);
  const r = Math.floor(4 - z);
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null;
}

export function createBoard(scene) {
  const markGeo = new THREE.PlaneGeometry(1, 1);
  const dotGeo = new THREE.PlaneGeometry(0.28, 0.28);
  const marks = {};
  for (const f of FILES) {
    for (let r = 1; r <= 8; r++) {
      const sq = f + r;
      const p = squarePos(sq);
      const full = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      full.rotation.x = -Math.PI / 2;
      full.position.set(p.x, 0.012, p.z);
      full.visible = false;
      const dot = new THREE.Mesh(
        dotGeo,
        new THREE.MeshBasicMaterial({ color: '#2bd94a', transparent: true, opacity: 0.85, depthWrite: false }),
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(p.x, 0.014, p.z);
      dot.visible = false;
      scene.add(full, dot);
      marks[sq] = { full, dot };
    }
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  return {
    /**
     * Shows the marks. s: { last: move or null, check: square or null,
     * selected: square or null, targets: the moves of the selected piece }
     */
    show({ last, check, selected, targets }) {
      for (const m of Object.values(marks)) {
        m.full.visible = false;
        m.dot.visible = false;
      }
      const paint = (sq, kind) => {
        const [colour, opacity] = CONFIG.marks[kind];
        marks[sq].full.material.color.set(colour);
        marks[sq].full.material.opacity = opacity;
        marks[sq].full.visible = true;
      };
      if (last) {
        paint(last.from, 'last');
        paint(last.to, 'last');
      }
      if (check) paint(check, 'check');
      if (selected) {
        paint(selected, 'select');
        for (const m of targets) {
          if (m.captured) paint(m.to, 'capture');
          else marks[m.to].dot.visible = true;
        }
      }
    },

    /**
     * What is under the screen point (x, y): { square, piece } with the
     * piece's 3D object if the mouse is on a piece, {} beside the board.
     */
    pick(x, y, camera, pieces) {
      ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const onPiece = ray.intersectObjects(pieces, true)[0];
      if (onPiece) {
        const root = onPiece.object.userData.pieceRoot;
        if (root) return { square: root.userData.square, piece: root };
      }
      if (ray.ray.intersectPlane(floor, hit)) {
        const square = squareAt(hit.x, hit.z);
        if (square) return { square };
      }
      return {};
    },
  };
}
