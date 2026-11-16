// Dust Dash – the other player as seen in the hall: a round, cute character
// with big eyes in its colour, a vacuum on its back, and a hose that ends
// in a nozzle on the floor in front of it. It hops a little while walking
// and its nozzle shakes while vacuuming. In front of a shelf, a crate or a
// wall the nozzle is pulled in, so it never sticks into an obstacle.

import * as THREE from './vendor/three.module.js';
import { POWER } from './config.js';
import { toon, flat, outlined } from './look.js';

const METAL = 0xd9d2c3;
const RUBBER = 0x4a4038;
const GOLD = 0xf2c230;

/** A colour made darker (f < 1) or lighter (f > 1). */
function shade(hex, f) {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}

// The nozzle's front edge lies this far in front of the character (metres).
const NOZZLE_OUT = 1.05;

/** calm: the player asked the system for less motion (no hopping). */
export class PlayerView {
  constructor(hex, calm, hall) {
    this.calm = calm;
    this.hall = hall;
    this.pulled = 0; // how far the nozzle is pulled in right now
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.stride = 0;
    this.time = 0;
    this.placed = false;

    const add = (parent, mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = (r, color, ink = 0.035) =>
      outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), toon(color)), ink);

    // The character looks along its own -z.
    const belly = add(this.body, ball(0.46, hex), 0, 0.62, 0);
    belly.scale.set(1, 1.12, 0.95);
    add(this.body, ball(0.34, hex), 0, 1.22, -0.02); // head
    for (const side of [-1, 1]) {
      add(this.body, ball(0.13, shade(hex, 0.8), 0.025), side * 0.2, 0.12, -0.04).scale.set(1, 0.7, 1.4); // feet
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), flat(0xffffff));
      add(this.body, eye, side * 0.14, 1.28, -0.28);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), flat(0x2a1a0e));
      add(this.body, pupil, side * 0.13, 1.27, -0.37);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), flat(0xffffff));
      add(this.body, shine, side * 0.13 + 0.025, 1.3, -0.42);
    }
    // The vacuum on the back: a tank with a lid
    const tank = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 16), toon(METAL)), 0.03);
    add(this.body, tank, 0, 0.72, 0.42);
    const lid = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), toon(shade(hex, 0.8))), 0.025);
    add(this.body, lid, 0, 1.06, 0.42);
    // The hose: from the tank over the right side to the hand
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 0.9, 0.5),
      new THREE.Vector3(0.6, 1.0, 0.3),
      new THREE.Vector3(0.66, 0.8, -0.15),
      new THREE.Vector3(0.5, 0.62, -0.42),
    ]);
    add(this.body, outlined(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 8), toon(RUBBER)), 0.015), 0, 0, 0);
    add(this.body, ball(0.12, hex, 0.025), 0.46, 0.62, -0.42); // the hand on the pipe

    // The pipe and the nozzle: from the hand down to the floor in front
    this.wand = new THREE.Group();
    this.wand.position.set(0.44, 0.62, -0.44);
    this.group.add(this.wand);
    const pipe = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 10), toon(METAL)), 0.012);
    pipe.rotation.x = -1.0; // leaning forward and down
    add(this.wand, pipe, -0.12, -0.26, -0.24);
    pipe.rotation.z = -0.3;
    const head = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.16), toon(hex)), 0.02);
    add(this.wand, head, -0.3, -0.56, -0.5);
    this.head = head;
    this.hex = hex;
    const lip = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.18), toon(RUBBER)), 0.012);
    add(this.wand, lip, -0.3, -0.605, -0.5);
    this.lip = lip;
  }

  /** p: the player of the rules. The picture glides after it, so it never jerks. */
  update(dt, p) {
    this.time += dt;
    const g = this.group;
    if (!this.placed) {
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.yaw;
      this.placed = true;
    }
    const k = 1 - Math.exp(-dt * 24);
    const before = g.position.x + g.position.z;
    g.position.x += (p.x - g.position.x) * k;
    g.position.z += (p.z - g.position.z) * k;
    // Turn the short way round.
    let turn = (p.yaw - g.rotation.y) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    g.rotation.y += turn * k;

    const speed = Math.hypot(p.vx, p.vz);
    this.stride += speed * dt;
    const moving = Math.abs(g.position.x + g.position.z - before) > 1e-4 || speed > 0.3;
    const hop = this.calm || !moving ? 0 : Math.abs(Math.sin(this.stride * 2.4)) * 0.07;
    this.body.position.y = hop;
    this.body.rotation.x = this.calm ? 0 : -Math.min(0.14, speed * 0.02); // leans into the walk
    const shake = this.calm || !p.vacuuming ? 0 : Math.sin(this.time * 55) * 0.006;
    // The nozzle shows the power-up: wider, or golden.
    const wide = p.power === POWER.WIDE ? 1.7 : 1;
    this.head.scale.x = this.lip.scale.x = wide;
    // Pull the nozzle in when there is not enough free floor ahead.
    const out = NOZZLE_OUT + (p.vacuuming ? 0.05 : 0);
    const room = this.hall.roomAhead(g.position.x, g.position.z, g.rotation.y, 0.23 * wide + 0.14, out + 0.1);
    const pull = Math.max(0, out - room);
    this.pulled += (pull - this.pulled) * k;
    if (this.pulled < pull) this.pulled = pull; // never into the obstacle
    this.wand.position.set(0.44 + shake, 0.62, -0.44 + (p.vacuuming ? -0.05 : 0) + this.pulled);
    this.head.material.color.set(p.power === POWER.GOLD ? GOLD : this.hex);
  }

  /** Puts the character back on a start point at once (new match). */
  reset() {
    this.placed = false;
  }
}
