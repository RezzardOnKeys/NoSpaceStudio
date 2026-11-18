// Millpond – sets up the 3D view: renderer, sky colour, fog, the warm
// afternoon sun and the soft light from above. The island, the pond and the
// landscape follow in step 2 of docs/MILLPOND.md; for now a plain patch of
// grass carries the board.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe3f2');
  scene.fog = new THREE.Fog('#bfe3f2', 30, 80);

  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 300);
  camera.position.set(0, 9, 9);

  const hemi = new THREE.HemisphereLight('#fff6e6', '#6b8a4a', 1.2);
  const sun = new THREE.DirectionalLight('#ffe8c4', 2.4);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: '#7fb35a', roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.3;
  grass.receiveShadow = true;
  scene.add(grass);

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

  return { renderer, scene, camera };
}
