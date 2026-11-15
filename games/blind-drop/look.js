// Blind Drop – the comic look: toon materials and thick ink outlines.
// Small helpers that every drawing file (world.js, characters.js,
// effects.js) uses, so the style is defined in one place.

import * as THREE from './vendor/three.module.js';

/** Colour of the thick comic outlines. */
export const INK = 0x1b1033;

// A tiny 3-pixel texture turns smooth shading into three hard steps.
const steps = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
steps.minFilter = THREE.NearestFilter;
steps.magFilter = THREE.NearestFilter;
steps.needsUpdate = true;

/** Material with cel shading (reacts to the lights). */
export const toon = (color, extra) =>
  new THREE.MeshToonMaterial({ color, gradientMap: steps, ...extra });

/** Material with one plain colour (ignores the lights). */
export const flat = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });

// Outline trick ("inverted hull"): draw the same shape again, slightly
// bigger, in ink colour and inside out. Only its rim stays visible.
const inkMat = flat(INK, { side: THREE.BackSide });

/** Adds an ink outline of the given thickness to a mesh and returns the mesh. */
export function outlined(mesh, thickness = 0.07) {
  mesh.geometry.computeBoundingBox();
  const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  const hull = new THREE.Mesh(mesh.geometry, inkMat);
  hull.scale.set(
    (size.x + thickness * 2) / size.x,
    (size.y + thickness * 2) / size.y,
    (size.z + thickness * 2) / size.z,
  );
  mesh.add(hull);
  return mesh;
}

/** A flat shape lying on the ground (facing up). */
export function onGround(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Repeatable "random" numbers, so the world looks the same for everyone. */
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
