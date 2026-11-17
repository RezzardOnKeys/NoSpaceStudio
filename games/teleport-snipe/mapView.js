// Teleport Snipe – what the temple garden looks like. For now only the
// raked gravel and the temple wall with its tiled roof; step 2 of the plan
// builds the rest of the garden from the boxes in map.js.

import * as THREE from './vendor/three.module.js';
import { SIZE, WALL_HEIGHT } from './map.js';

const GRAVEL = 0xe4dccb;
const PLASTER = 0xf3eee4; // the white wall
const STONE = 0x9a968f; // the wall's foot
const TILES = 0x4a5560; // dark grey roof tiles

const box = (w, h, d, color) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

export function buildMapView() {
  const group = new THREE.Group();

  // The ground reaches a little under the wall, so no gap is ever seen.
  const ground = box(SIZE + 4, 0.2, SIZE + 4, GRAVEL);
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  group.add(ground);

  // The temple wall on all four sides: stone foot, white plaster, tiled roof.
  const half = SIZE / 2;
  const thick = 0.8;
  for (let side = 0; side < 4; side++) {
    const along = side < 2; // the two walls along x
    const sign = side % 2 === 0 ? 1 : -1;
    const len = SIZE + thick * 2;
    const wall = new THREE.Group();
    const foot = box(len, 0.7, thick + 0.1, STONE);
    foot.position.y = 0.35;
    const plaster = box(len, WALL_HEIGHT - 0.7, thick, PLASTER);
    plaster.position.y = 0.7 + (WALL_HEIGHT - 0.7) / 2;
    const roof = box(len + 0.6, 0.35, thick + 1, TILES);
    roof.position.y = WALL_HEIGHT + 0.15;
    for (const part of [foot, plaster, roof]) {
      part.castShadow = true;
      part.receiveShadow = true;
      wall.add(part);
    }
    if (along) {
      wall.position.set(0, 0, sign * (half + thick / 2));
    } else {
      wall.rotation.y = Math.PI / 2;
      wall.position.set(sign * (half + thick / 2), 0, 0);
    }
    group.add(wall);
  }
  return group;
}
