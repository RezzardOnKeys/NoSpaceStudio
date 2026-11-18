// Millpond – sets up the 3D view: renderer, the warm afternoon sun and the
// soft light from above, a light haze towards the horizon, and the world
// round the board (world.js) with the koi (koi.js).

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { buildWorld } from './world.js';
import { createKoi } from './koi.js';

export function createScene(canvas, calm) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  // A warm haze: far things fade into the colour of the sky at the horizon.
  scene.fog = new THREE.Fog(CONFIG.world.sky.horizon, 45, 150);

  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 320);
  camera.position.set(0, 10, 14);

  const hemi = new THREE.HemisphereLight('#fff1dc', '#6d8c48', 1.25);
  // The sun stands fairly low in the west, so the light is warm and the shadows long.
  const sun = new THREE.DirectionalLight('#ffdcae', 2.6);
  sun.position.set(-11, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const world = buildWorld(scene, calm);
  const koi = createKoi(scene, calm);

  // The pixel density is set again on every resize, so the picture stays
  // sharp after moving the window to another monitor.
  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    world,
    koi,
    /** Moves the water, the wheel, the clouds and the fish on; t = seconds since the start. */
    update(t, dt) {
      world.update(t, dt);
      koi.update(t, dt);
    },
  };
}
