// Dust Dash – the player's own vacuum in first person. The nozzle lies on
// the floor in front of the player, a pipe leads from it up to the hand at
// the bottom right of the picture, and a bit of hose hangs behind the hand.
// The nozzle always stays on the floor and never sticks into a shelf, a
// crate or a wall: in front of an obstacle it is pulled in closer. It
// sways a little while walking and shakes softly while vacuuming. With a
// power-up it looks different: wider (wide nozzle), with a purple glow
// (strong suction) or golden with a warm glow (golden nozzle).

import * as THREE from './vendor/three.module.js';
import { CONFIG, POWER } from './config.js';
import { toon, flat, outlined } from './look.js';

const METAL = 0xd9d2c3;
const RUBBER = 0x4a4038;
const GOLD = 0xf2c230;
const REACH = 1.05; // how far in front of the player the nozzle lies (metres)
const HEAD = 0.42; // width of the nozzle's head

/** calm: the player asked the system for less motion (no shaking). */
export function createViewModel(hall, calm) {
  // Everything is placed as seen from the player's feet: -z is forward, x
  // is to the right. The group is moved and turned with the player.
  const group = new THREE.Group();
  group.visible = false;

  const paint = toon(0xffffff); // the parts that carry the player's colour
  const part = (geometry, material, ink = 0.014) => {
    const mesh = outlined(new THREE.Mesh(geometry, material), ink);
    group.add(mesh);
    return mesh;
  };

  // The nozzle: a flat, wide head with a rubber lip, flat on the floor
  const nozzle = new THREE.Group();
  group.add(nozzle);
  const head = outlined(new THREE.Mesh(new THREE.BoxGeometry(HEAD, 0.07, 0.17), paint), 0.014);
  head.position.y = 0.06;
  const lip = outlined(new THREE.Mesh(new THREE.BoxGeometry(HEAD + 0.02, 0.025, 0.19), toon(RUBBER)), 0.01);
  lip.position.y = 0.014;
  const neck = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.12), paint), 0.012);
  neck.position.set(0, 0.1, 0.1);
  nozzle.add(head, lip, neck);
  // A soft light in front of the nozzle, for strong suction and the golden nozzle.
  const glowMat = flat(0xffffff, {
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), glowMat);
  glow.scale.set(1.5, 0.35, 0.9);
  glow.position.set(0, 0.08, -0.12);
  nozzle.add(glow);
  // Where the dirt goes in: the front edge of the head.
  const mouth = new THREE.Object3D();
  mouth.position.set(0, 0.05, -0.1);
  nozzle.add(mouth);

  // The pipe from the nozzle up to the hand, the grip, and the hose behind it
  const pipe = part(new THREE.CylinderGeometry(0.026, 0.026, 1, 12), toon(METAL), 0.011);
  const grip = part(new THREE.CylinderGeometry(0.036, 0.036, 0.2, 12), paint, 0.011);
  const hose = [];
  for (let i = 0; i < 6; i++) hose.push(part(new THREE.TorusGeometry(0.04, 0.015, 6, 14), toon(RUBBER), 0.008));

  const hand = new THREE.Vector3();
  const foot = new THREE.Vector3();
  const along = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  let pull = 0; // 0 at rest, 1 while vacuuming (glides between the two)
  let time = 0;
  let baseHex = 0xffffff;
  let power = -1;
  let wide = 1; // how wide the head is drawn (glides to 1.7 with the wide nozzle)
  let reach = REACH; // how far out the nozzle lies right now

  return {
    group,
    show(on) {
      group.visible = on;
    },
    setColor(hex) {
      baseHex = hex;
      paint.color.set(hex);
      power = -1;
      reach = REACH;
    },

    /** The player's power-up changed (-1: none): the nozzle changes its look. */
    setPower(next) {
      if (next === power) return;
      power = next;
      paint.color.set(power === POWER.GOLD ? GOLD : baseHex);
      glowMat.color.set(power === POWER.GOLD ? 0xffd75a : 0xa77bff);
    },

    /**
     * x, z, yaw: where the player stands and looks; stride: metres walked
     * so far; speed: 0..1 of the walking speed; vacuuming: the button is held.
     */
    update(dt, x, z, yaw, stride, speed, vacuuming) {
      time += dt;
      pull += ((vacuuming ? 1 : 0) - pull) * Math.min(1, dt * 14);
      wide += ((power === POWER.WIDE ? 1.7 : 1) - wide) * Math.min(1, dt * 10);
      group.position.set(x, 0, z);
      group.rotation.y = yaw;

      // The nozzle lies as far out as there is room, and glides there.
      const room = hall.roomAhead(x, z, yaw, (HEAD * wide) / 2 + 0.03, REACH + 0.1 * pull + 0.12) - 0.12;
      const want = Math.max(CONFIG.move.radius - 0.1, Math.min(REACH + 0.1 * pull, room));
      reach += (want - reach) * Math.min(1, dt * 18);
      if (reach > room) reach = Math.max(CONFIG.move.radius - 0.1, room); // never into the obstacle

      const shake = calm ? 0 : pull;
      const sway = calm ? 0 : speed;
      nozzle.position.set(0.16 + Math.sin(time * 58) * 0.004 * shake, 0, -reach);
      head.scale.x = lip.scale.x = wide;

      // The hand with the grip sits at the bottom right of the picture (it
      // is in view also when the player looks straight ahead) and bobs a
      // little with the steps. In front of an obstacle it is pulled in too.
      hand.set(
        0.34 + Math.sin(stride * 0.95) * 0.012 * sway,
        1.26 + Math.abs(Math.sin(stride * 0.95)) * 0.015 * sway,
        -Math.min(0.55, Math.max(0.25, room - 0.12)),
      );
      foot.set(nozzle.position.x, 0.12, -reach + 0.1);
      along.subVectors(hand, foot);
      const length = along.length();
      pipe.position.copy(foot).addScaledVector(along, 0.5);
      pipe.scale.y = length;
      pipe.quaternion.setFromUnitVectors(UP, along.normalize());
      grip.position.copy(hand).addScaledVector(along, -0.08);
      grip.quaternion.copy(pipe.quaternion);
      // The hose hangs from the grip down and out of the picture.
      hose.forEach((rib, i) => {
        rib.position.set(hand.x + 0.035 * (i + 1), hand.y - 0.05 * (i + 1) - 0.006 * i * i, hand.z + 0.035 * (i + 1));
        rib.rotation.set(1.2 + 0.06 * i, 0, 0.5);
      });

      const lit = power === POWER.STRONG || power === POWER.GOLD;
      const beat = calm ? 0.3 : 0.3 + Math.sin(time * 7) * 0.08;
      glowMat.opacity += ((lit ? beat : 0) - glowMat.opacity) * Math.min(1, dt * 10);
      group.updateMatrixWorld(true);
    },

    /** Writes the place of the nozzle's mouth in the hall into `out`. */
    mouth(out) {
      return mouth.getWorldPosition(out);
    },
  };
}
