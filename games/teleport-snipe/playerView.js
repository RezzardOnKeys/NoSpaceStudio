// Teleport Snipe – the other player as a simple, friendly figure: a long
// coat in the player's colour, a straw hat and a long rifle. A thin dark
// outline (a slightly bigger copy seen from the inside) keeps the figure
// readable against the light garden at a distance.

import * as THREE from './vendor/three.module.js';

const SKIN = 0xf1c9a5;
const STRAW = 0xd9b56a;
const WOOD = 0x6b3f22;
const METAL = 0x2e3236;
const OUTLINE = 0x1d1a17;

const outlineMaterial = new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide });

/** Adds a mesh with its outline to the group. */
function part(group, geometry, color, x, y, z) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  const edge = new THREE.Mesh(geometry, outlineMaterial);
  edge.scale.setScalar(1.07);
  mesh.add(edge);
  group.add(mesh);
  return mesh;
}

export class PlayerView {
  /** color: the coat colour as a number (0xrrggbb). */
  constructor(color) {
    this.group = new THREE.Group();
    const g = this.group;
    part(g,new THREE.CylinderGeometry(0.26, 0.42, 1.3, 10), color, 0, 0.65, 0);
    part(g, new THREE.CylinderGeometry(0.2, 0.26, 0.22, 10), color, 0, 1.38, 0); // shoulders
    part(g, new THREE.SphereGeometry(0.2, 12, 10), SKIN, 0, 1.6, 0);
    part(g, new THREE.ConeGeometry(0.42, 0.22, 14), STRAW, 0, 1.8, 0); // hat
    // The rifle, held across the chest and pointing forward (-z).
    const rifle = new THREE.Group();
    part(rifle, new THREE.BoxGeometry(0.07, 0.11, 0.7), WOOD, 0, 0, 0.1);
    part(rifle, new THREE.BoxGeometry(0.04, 0.04, 0.75), METAL, 0, 0.03, -0.6);
    part(rifle, new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8), METAL, 0, 0.11, -0.05).rotation.x =
      Math.PI / 2; // scope
    rifle.position.set(0.18, 1.25, -0.2);
    g.add(rifle);
  }

  /** Puts the figure at a spot; yaw 0 looks towards -z like the camera. */
  place(x, y, z, yaw) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = yaw;
  }
}
