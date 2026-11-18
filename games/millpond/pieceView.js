// Millpond – the pieces on the board. For now every piece is a simple round
// stone in its side's colour that is set straight onto its point; the
// ladybug and snail figures with their walking, flying and sliding follow in
// step 3 of docs/MILLPOND.md.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { pointPos } from './board.js';

export function createPieceView(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.CylinderGeometry(0.3, 0.34, 0.22, 28);
  const mats = {
    l: new THREE.MeshStandardMaterial({ color: CONFIG.colors.l, roughness: 0.5 }),
    s: new THREE.MeshStandardMaterial({ color: CONFIG.colors.s, roughness: 0.5 }),
  };
  const onPoint = Array(24).fill(null);

  return {
    group,

    /** Shows exactly the pieces of this board (24 entries: 'l', 's' or null). */
    sync(board) {
      for (let p = 0; p < 24; p++) {
        const want = board[p];
        const have = onPoint[p];
        if (have && have.userData.side === want) continue;
        if (have) {
          group.remove(have);
          onPoint[p] = null;
        }
        if (!want) continue;
        const piece = new THREE.Mesh(geo, mats[want]);
        piece.position.copy(pointPos(p)).setY(0.11);
        piece.castShadow = true;
        piece.userData = { point: p, side: want };
        group.add(piece);
        onPoint[p] = piece;
      }
    },
  };
}
