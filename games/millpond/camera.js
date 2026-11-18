// Millpond – the camera: drag to turn round the island, the mouse wheel (or
// two fingers) to zoom (OrbitControls from three.js, shipped in vendor/),
// and a smooth swing round to a player's side of the board. The camera
// always looks at the board, never dips under the water and never goes too
// far away.

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { CONFIG } from './config.js';

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export function createCameraRig(camera, canvas, calm) {
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false; // the board stays in the middle
  controls.maxPolarAngle = Math.PI * CONFIG.camera.maxPolar;
  controls.minDistance = CONFIG.camera.minDistance;
  controls.maxDistance = CONFIG.camera.maxDistance;

  let swing = null; // the running swing to a side

  return {
    /** Behind the menu the camera turns slowly round the island. */
    setAutoRotate(on) {
      controls.autoRotate = on && !calm;
      controls.autoRotateSpeed = 0.5;
    },

    /** Swings round the board to the side of `side` ('l' sits at +z, 's' at -z). */
    viewSide(side) {
      const fromPos = camera.position.clone();
      // On a narrow screen (a phone held upright, a small window) the camera
      // stays further away, so the whole board fits from side to side.
      const fit = Math.min(2.2, Math.max(1, 1.3 / camera.aspect));
      const dist = Math.min(CONFIG.camera.maxDistance, 11 * fit);
      const z = side === 's' ? -1 : 1;
      const toPos = new THREE.Vector3(0, dist * 0.72, z * dist * 0.69);
      const a0 = Math.atan2(fromPos.x, fromPos.z);
      const a1 = Math.atan2(toPos.x, toPos.z);
      const r0 = Math.hypot(fromPos.x, fromPos.z);
      const r1 = Math.hypot(toPos.x, toPos.z);
      swing = { t: calm ? CONFIG.anim.cameraTurn : 0, fromPos, toPos, a0, a1, r0, r1 };
    },

    update(dt) {
      if (swing) {
        swing.t += dt;
        const e = ease(Math.min(1, swing.t / CONFIG.anim.cameraTurn));
        const a = lerpAngle(swing.a0, swing.a1, e);
        const r = swing.r0 + (swing.r1 - swing.r0) * e;
        camera.position.set(Math.sin(a) * r, swing.fromPos.y + (swing.toPos.y - swing.fromPos.y) * e, Math.cos(a) * r);
        if (e >= 1) swing = null;
      }
      controls.update();
    },
  };
}
