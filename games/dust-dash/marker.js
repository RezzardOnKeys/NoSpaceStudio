// Dust Dash – the delivery icon on the screen. It sits where the box is,
// also through walls and shelves, and shows the distance in metres. If the
// box is behind the player or outside the picture, the icon moves to the
// edge of the screen and an arrow points the way.

import * as THREE from './vendor/three.module.js';

const EDGE = 64; // the icon keeps this many pixels away from the screen's edge
const point = new THREE.Vector3();

export function createMarker() {
  const el = document.getElementById('marker');
  const arrow = document.getElementById('markerArrow');
  const dist = document.getElementById('markerDist');

  return {
    hide() {
      el.hidden = true;
    },

    /** d: the delivery of the rules; me: the player's character. */
    update(camera, d, me) {
      if (d.state === 'timer') {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Where the box is as the camera sees it: x right, y up, z behind the camera.
      point.set(d.x, 1.1, d.z).applyMatrix4(camera.matrixWorldInverse);
      const behind = point.z > -0.1;
      point.applyMatrix4(camera.projectionMatrix);
      let x = (point.x * 0.5 + 0.5) * w;
      let y = (-point.y * 0.5 + 0.5) * h;
      const inside = !behind && x > EDGE && x < w - EDGE && y > EDGE && y < h - EDGE;
      if (inside) {
        arrow.hidden = true;
      } else {
        // Direction from the middle of the screen to the box. Behind the
        // camera the picture is mirrored, so the direction is turned around.
        let dx = x - w / 2;
        let dy = y - h / 2;
        if (behind) {
          dx = -dx;
          dy = -dy;
        }
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        // Go from the middle in that direction until the edge is reached.
        const reach = Math.min(
          (w / 2 - EDGE) / Math.max(1e-6, Math.abs(dx)),
          (h / 2 - EDGE) / Math.max(1e-6, Math.abs(dy)),
        );
        x = w / 2 + dx * reach;
        y = h / 2 + dy * reach;
        arrow.hidden = false;
        arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad) translateX(34px)`;
      }
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      dist.textContent = `${Math.round(Math.hypot(d.x - me.x, d.z - me.z))} m`;
    },
  };
}
