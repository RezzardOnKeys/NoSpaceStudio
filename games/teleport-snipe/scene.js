// Teleport Snipe – sets up the 3D view: renderer, camera, the soft
// afternoon light and the picture size. What is shown comes from
// mapView.js (the garden) and playerView.js (the other player).

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

// A pale, warm afternoon sky; far things fade into it a little.
const SKY = 0xcfe3ee;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 45, 130);
  const camera = new THREE.PerspectiveCamera(CONFIG.look.fov, 1, 0.08, 220);
  camera.rotation.order = 'YXZ';

  // Soft light from everywhere (sky blue from above, warm from the gravel) ...
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc9b48a, 1.6));
  // ... and the low afternoon sun.
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.1);
  sun.position.set(-22, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -32,
    right: 32,
    top: 32,
    bottom: -32,
    near: 1,
    far: 90,
  });
  sun.shadow.bias = -0.0008;
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
