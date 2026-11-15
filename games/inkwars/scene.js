// Inkwars – sets up the 3D view: renderer, light, fog and the picture size.
// What is shown comes from arenaView.js (arena), actorView.js (characters)
// and effects.js (water drops and splashes).

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

const SKY = 0xeceef1;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 190);
  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 400);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dce2, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-22, 40, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -36,
    right: 36,
    top: 30,
    bottom: -30,
    near: 1,
    far: 100,
  });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 5; // soft studio shadows
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
