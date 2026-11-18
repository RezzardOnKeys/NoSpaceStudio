// Blockchess – sets up the 3D view: renderer, sky colour, fog, sun and the
// soft light from above, the block world (world.js), and the switch between
// day and night.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { buildWorld } from './world.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fc3ff');
  scene.fog = new THREE.Fog('#8fc3ff', 35, 90);

  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 400);
  camera.position.set(0, 8.5, 10.5);

  const hemi = new THREE.HemisphereLight('#ddeeff', '#5a4a30', 1.1);
  const sun = new THREE.DirectionalLight('#fff4dc', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const world = buildWorld(scene);

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

  let night = 0;
  let nightTarget = 0;
  const sunBase = new THREE.Vector3(14, 22, 9);
  const dayLight = new THREE.Color('#fff4dc');
  const moonLight = new THREE.Color('#9fb4ff');

  return {
    renderer,
    scene,
    camera,
    toggleNight() {
      nightTarget = nightTarget > 0.5 ? 0 : 1;
    },
    /** Moves the light, sky and clouds on; t = seconds since the start. */
    update(t, dt) {
      night += (nightTarget - night) * Math.min(1, dt * 1.5);
      sun.intensity = 2.2 * (1 - night) + 0.35 * night;
      sun.color.copy(dayLight).lerp(moonLight, night);
      hemi.intensity = 1.1 * (1 - night) + 0.25 * night;
      sun.position.copy(sunBase);
      sun.position.x *= 1 - 2 * night;
      world.update(t, dt, night, camera);
    },
  };
}
