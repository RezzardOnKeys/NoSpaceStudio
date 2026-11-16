// Inkwars – where the camera is: behind the player's shoulder during a
// match, circling the arena in the menu and straight above it for the
// result. It also works out the point the crosshair is aiming at.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';

export function createCameraRig(camera, arena) {
  const pivot = new THREE.Vector3();
  const want = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const down = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'));
  let dist = CONFIG.camera.distHuman;

  const setForward = (yaw, pitch) =>
    fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

  return {
    /** Jump straight behind the character (start of a match). */
    reset(actor) {
      pivot.copy(actor.pos);
      dist = CONFIG.camera.distHuman;
    },

    /** Over the shoulder; as a fish the camera sits lower and further back. */
    follow(actor, yaw, pitch, dt) {
      const C = CONFIG.camera;
      const m = actor.morph;
      const height = C.heightHuman + (C.heightFish - C.heightHuman) * m;
      const shoulder = C.shoulder * (1 - m);
      want.set(
        actor.pos.x + Math.cos(yaw) * shoulder,
        actor.pos.y + height,
        actor.pos.z - Math.sin(yaw) * shoulder,
      );
      pivot.lerp(want, 1 - Math.exp(-dt * C.follow));
      setForward(yaw, pitch);

      // do not look through walls or the floor
      const full = C.distHuman + (C.distFish - C.distHuman) * m;
      let free = full;
      for (let i = 1; i <= 12; i++) {
        const t = (full * i) / 12;
        probe.copy(pivot).addScaledVector(fwd, -t);
        if (probe.y < arena.heightAt(probe.x, probe.z) + 0.3) {
          free = Math.max(0.8, (full * (i - 1)) / 12);
          break;
        }
      }
      dist += (free - dist) * (free < dist ? 1 : Math.min(1, dt * 6));
      camera.position.copy(pivot).addScaledVector(fwd, -dist);
      camera.rotation.set(pitch, yaw, 0);
    },

    /**
     * The point in the arena the crosshair points at. The search starts just
     * in front of the gun, so a wall right in front of the player counts too.
     */
    aimPoint(yaw, pitch, out) {
      setForward(yaw, pitch);
      arena.raycast(camera.position, fwd, dist + 0.6, 45, out);
      return out;
    },

    /** Where the search of aimPoint() starts: just in front of the gun (metres from the camera). */
    aimStart: () => dist + 0.6,

    /** The point t metres from the camera in the direction of the crosshair. */
    alongAim(yaw, pitch, t, out) {
      setForward(yaw, pitch);
      return out.copy(camera.position).addScaledVector(fwd, t);
    },

    /** Slowly circling the arena (menu). */
    orbit(clock) {
      camera.position.set(Math.cos(clock * 0.12) * 46, 24, Math.sin(clock * 0.12) * 36);
      camera.lookAt(0, 0, 0);
    },

    /** Gliding to a view from straight above that shows the whole arena (result). */
    topDown(dt) {
      const tan = Math.tan((CONFIG.camera.fov * Math.PI) / 360);
      const h = Math.max((arena.D + 8) / (2 * tan), (arena.W + 8) / (2 * tan * camera.aspect));
      const k = 1 - Math.exp(-dt * 2.5);
      camera.position.lerp(want.set(0, h, 0.01), k);
      camera.quaternion.slerp(down, k);
    },
  };
}
