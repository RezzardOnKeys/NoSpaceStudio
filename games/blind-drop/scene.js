// Blind Drop – everything you can see. This file sets up the 3D view (canvas,
// fixed camera, frame loop) and puts the parts together:
//   look.js        comic style: toon materials, ink outlines
//   world.js       lights, sky, island, the Classic and Snipe looks
//   characters.js  the players and their name tags
//   effects.js     puffs, comic words, bombs, explosions, aim circle
// It only draws. It knows nothing about rules or the network; game.js tells
// it what to show.

import * as THREE from './vendor/three.module.js';
import { ISLAND_R } from './config.js';
import { createWorld } from './world.js';
import { createCharacters } from './characters.js';
import { createEffects } from './effects.js';

/** Sharpness of the picture: the screen's pixel density, at most 2. */
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

export function createView(canvas, labelLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();

  // Fixed view from the side above. The player cannot change it. The narrow
  // lens (22°) keeps the rocky underside visible below the island.
  const camera = new THREE.PerspectiveCamera(22, 1, 1, 1200);
  const CAM_DIR = new THREE.Vector3(0, 0.6, 0.8).normalize(); // island -> camera
  const CAM_UP = new THREE.Vector3(0, CAM_DIR.z, -CAM_DIR.y); // "up" on screen
  const CAM_TARGET = new THREE.Vector3(0, -2.2, 0);
  const camBase = new THREE.Vector3();
  let width = 1;
  let height = 1;
  let time = 0;
  let shakeLeft = 0;
  let shakePower = 0;
  let lastFrameAt = performance.now();

  /** Where on screen (in pixels) is this place in the world? */
  function project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  }

  function shake(seconds, power) {
    shakeLeft = Math.max(shakeLeft, seconds);
    shakePower = Math.max(shakePower, power);
  }

  /** False while the tab is in the background and no frames are drawn. */
  const isDrawing = () => performance.now() - lastFrameAt < 500;

  const world = createWorld(scene, { dir: CAM_DIR, up: CAM_UP });
  const chars = createCharacters(scene, labelLayer, project);
  const fx = createEffects({ scene, camera, labelLayer, project, shake, isDrawing });

  // ---- Characters together with effects ------------------------------------
  /** A character disappears in a cloud ("POOF!"). */
  function vanish(id, color) {
    const at = chars.stateOf(id);
    if (!at || !at.visible) return;
    fx.poof(at.x, at.z, color, 'POOF!');
    chars.setVisible(id, false);
  }

  /** A character is shown at (x, z); with a cloud if it was hidden before. */
  function appear(id, x, z) {
    const at = chars.stateOf(id);
    if (!at) return;
    chars.place(id, x, z);
    chars.setVisible(id, true);
    if (!at.visible) fx.poof(x, z);
  }

  /** A character jumps to (x, z) with a cloud at both ends ("ZAP!"). */
  function teleport(id, x, z, color) {
    const at = chars.stateOf(id);
    if (!at) return;
    fx.poof(at.x, at.z);
    chars.place(id, x, z);
    fx.poof(x, z, color, 'ZAP!');
  }

  /** Switches the whole look: 'classic' or 'snipe'. */
  function setTheme(name) {
    world.setTheme(name);
    fx.setCrosshair(name === 'snipe');
  }

  /** Sets the island size; with `animate` it shrinks smoothly and rumbles. */
  function setRadius(radius, animate) {
    world.setRadius(radius, animate);
    if (animate) shake(0.7, 0.25);
  }

  /** Where on the ground (y = 0) does this mouse position point? */
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    // Also here, because the density changes when the window moves to
    // another monitor.
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Move the camera back until the whole island fits, wide or tall window.
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const distance = Math.max((ISLAND_R + 1.6) / (t * camera.aspect), 11 / t);
    camBase.copy(CAM_TARGET).addScaledVector(CAM_DIR, distance);
    camera.position.copy(camBase);
    camera.lookAt(CAM_TARGET);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(); // so aiming works even before the first frame
  }

  /** Advances all animations by dt seconds and draws one frame. */
  function update(dt) {
    time += dt;
    lastFrameAt = performance.now();
    world.update(dt, time);
    chars.update(dt, time);
    fx.update(dt, time);

    camera.position.copy(camBase);
    if (shakeLeft > 0) {
      shakeLeft -= dt;
      const p = shakePower * Math.min(1, shakeLeft * 3);
      camera.position.x += (Math.random() - 0.5) * p;
      camera.position.y += (Math.random() - 0.5) * p;
      if (shakeLeft <= 0) shakePower = 0;
    }
    renderer.render(scene, camera);
  }

  resize();
  return {
    resize, update, groundAt, setTheme, setRadius, vanish, appear, teleport,
    setPlayers: chars.setPlayers,
    resetPose: chars.resetPose,
    place: chars.place,
    setVisible: chars.setVisible,
    setMoving: chars.setMoving,
    knockout: chars.knockout,
    cheer: chars.cheer,
    dropBomb: fx.dropBomb,
    setAim: fx.setAim,
    setBlast: fx.setBlast,
  };
}
