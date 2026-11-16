// Dust Dash – the comic look: toon materials with a few hard steps of light
// and thick, warm brown outlines. Small helpers that every drawing file
// uses, so the style is defined in one place.

import * as THREE from './vendor/three.module.js';

/** Colour of the thick comic outlines: a dark, warm brown. */
export const INK = 0x3b2413;

// A tiny 3-pixel texture turns smooth shading into three hard steps. The
// darkest step is still quite bright, so shadows stay gentle and cosy.
const steps = new THREE.DataTexture(new Uint8Array([150, 208, 255]), 3, 1, THREE.RedFormat);
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
export function outlined(mesh, thickness = 0.04) {
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

/** Repeatable "random" numbers, so the hall looks the same for everyone. */
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
