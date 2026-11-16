// Dust Dash – sets up the 3D view: renderer, camera, the warm light and the
// picture size. What is shown comes from hallView.js (the hall); the dirt
// and the characters are added later.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

// Warm afternoon haze; far things fade into it a little.
const HAZE = 0xf1d3a0;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HAZE);
  scene.fog = new THREE.Fog(HAZE, 26, 95);
  const camera = new THREE.PerspectiveCamera(CONFIG.look.fov, 1, 0.08, 200);
  camera.rotation.order = 'YXZ';

  // Soft light from everywhere (warm from above, brown from the floor) ...
  scene.add(new THREE.HemisphereLight(0xfff0d2, 0x9a6a3a, 1.7));
  // ... and the low afternoon sun that falls in through the front windows.
  const sun = new THREE.DirectionalLight(0xffc98a, 1.9);
  sun.position.set(9, 15, 17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -26,
    right: 26,
    top: 20,
    bottom: -20,
    near: 1,
    far: 60,
  });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4; // soft edges
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Set again on every resize: the window may have moved to another monitor.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera };
}
