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
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w <= 700) camera.setViewOffset(w, h, 0, h * CONFIG.camera.phoneShift, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const surface = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CONFIG.world.waterY);
  const hit = new THREE.Vector3();

  // Afternoon and dusk: the sun sinks and turns orange, the sky light gets
  // soft and blue; everything changes smoothly over a moment.
  const D = CONFIG.world.dusk;
  const day = { sun: sun.color.clone(), sunI: sun.intensity, sunPos: sun.position.clone(), sky: hemi.color.clone(), ground: hemi.groundColor.clone(), hemiI: hemi.intensity };
  const duskSunPos = new THREE.Vector3(-14, 4.5, 6);
  const fogDay = new THREE.Color(CONFIG.world.sky.horizon);
  const fogDusk = new THREE.Color(D.horizon);
  let dusk = 0;
  let duskTarget = 0;
  let shown = -1;

  return {
    renderer,
    scene,
    camera,
    world,
    koi,
    /** Switches between afternoon and dusk (N); true if it becomes dusk. */
    toggleDusk() {
      duskTarget = duskTarget > 0.5 ? 0 : 1;
      return duskTarget === 1;
    },
    /** Where the screen point (x, y) meets the open water of the pond, or null. */
    waterAt(x, y) {
      ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(surface, hit)) return null;
      const r = Math.hypot(hit.x, hit.z);
      const W = CONFIG.world;
      return r > W.islandRadius + 1.4 && r < W.pondRadius - 0.6 ? { x: hit.x, z: hit.z } : null;
    },
    /** Moves the water, the wheel, the clouds and the fish on; t = seconds since the start. */
    update(t, dt) {
      dusk += Math.sign(duskTarget - dusk) * Math.min(Math.abs(duskTarget - dusk), dt / D.fade);
      if (dusk !== shown) {
        shown = dusk;
        const d = dusk * dusk * (3 - 2 * dusk);
        sun.color.copy(day.sun).lerp(new THREE.Color(D.sun), d);
        sun.intensity = day.sunI * (1 - 0.4 * d);
        sun.position.lerpVectors(day.sunPos, duskSunPos, d);
        hemi.color.copy(day.sky).lerp(new THREE.Color(D.sky), d);
        hemi.groundColor.copy(day.ground).lerp(new THREE.Color(D.ground), d);
        hemi.intensity = day.hemiI * (1 - 0.3 * d);
        scene.fog.color.copy(fogDay).lerp(fogDusk, d);
        world.setDusk(d);
      }
      world.update(t, dt);
      koi.update(t, dt);
    },
  };
}
