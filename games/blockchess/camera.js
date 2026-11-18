// Blockchess – the camera: drag with the left mouse button to turn round the
// board, with the right one to slide, the wheel to zoom (OrbitControls from
// three.js, shipped in vendor/), WASD to fly, Q/E or Shift/Space to go down
// and up, and a smooth swing round to a player's side of the board.

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { CONFIG } from './config.js';

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Keys that fly the camera; they do nothing while a button or field has the focus. */
const FLY_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', ' ', 'shift']);

export function createCameraRig(camera, canvas, calm) {
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = CONFIG.camera.minDistance;
  controls.maxDistance = CONFIG.camera.maxDistance;

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (FLY_KEYS.has(k)) {
      keys.add(k);
      if (k === ' ') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  let swing = null; // the running swing to a side
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  function fly(dt) {
    move.set(0, 0, 0);
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    if (keys.has('w')) move.add(fwd);
    if (keys.has('s')) move.sub(fwd);
    if (keys.has('d')) move.add(right);
    if (keys.has('a')) move.sub(right);
    if (keys.has('e') || keys.has(' ')) move.y += 1;
    if (keys.has('q') || keys.has('shift')) move.y -= 1;
    if (move.lengthSq() === 0) return;
    swing = null;
    move.normalize().multiplyScalar(dt * CONFIG.camera.flySpeed);
    camera.position.add(move);
    controls.target.add(move);
  }

  return {
    /** Behind the menu the camera turns slowly round the island. */
    setAutoRotate(on) {
      controls.autoRotate = on && !calm;
      controls.autoRotateSpeed = 0.6;
    },

    /** Swings round the board to the side of `color` ('w' or 'b'). */
    viewSide(color) {
      const fromPos = camera.position.clone();
      const fromT = controls.target.clone();
      // On a narrow screen (a phone held upright) the camera stays further
      // away, so the whole board fits from side to side.
      const fit = camera.aspect < 1 ? Math.min(2.2, 0.8 / camera.aspect) : 1;
      const dist = Math.min(CONFIG.camera.maxDistance, Math.max(8, Math.min(16, fromPos.distanceTo(fromT))) * fit);
      const z = color === 'w' ? 1 : -1;
      const toPos = new THREE.Vector3(0, dist * 0.63, z * dist * 0.78);
      // Along an arc round the board instead of straight across it.
      const a0 = Math.atan2(fromPos.x - fromT.x, fromPos.z - fromT.z);
      const a1 = Math.atan2(toPos.x, toPos.z);
      const r0 = Math.hypot(fromPos.x - fromT.x, fromPos.z - fromT.z);
      const r1 = Math.hypot(toPos.x, toPos.z);
      swing = { t: calm ? CONFIG.anim.cameraTurn : 0, fromPos, fromT, toPos, a0, a1, r0, r1 };
    },

    update(dt) {
      fly(dt);
      if (swing) {
        swing.t += dt;
        const e = ease(Math.min(1, swing.t / CONFIG.anim.cameraTurn));
        const a = lerpAngle(swing.a0, swing.a1, e);
        const r = swing.r0 + (swing.r1 - swing.r0) * e;
        controls.target.lerpVectors(swing.fromT, new THREE.Vector3(0, 0, 0), e);
        camera.position.set(
          controls.target.x + Math.sin(a) * r,
          swing.fromPos.y + (swing.toPos.y - swing.fromPos.y) * e,
          controls.target.z + Math.cos(a) * r,
        );
        if (e >= 1) swing = null;
      }
      controls.update();
    },
  };
}
