// Inkwars – small moving things: flying water drops, the small drips that
// fall out of them, and splash particles.

import * as THREE from './vendor/three.module.js';
const dummy = new THREE.Object3D();
const col = new THREE.Color();
/** Flying water: drops at full size, falling drips smaller (sim.drips). */
export class ProjectileView {
  constructor(colors) {
    this.colors = colors;
    this.max = 2500;
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshLambertMaterial(),
      this.max,
    );
    this.mesh.setColorAt(0, col.set(0xffffff));
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }
  update(drops, drips) {
    let n = 0;
    const add = (p, size) => {
      if (n >= this.max) return;
      dummy.position.copy(p.pos);
      dummy.scale.set(size, size * 1.4, size);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(n, dummy.matrix);
      this.mesh.setColorAt(n, this.colors[p.team]);
      n++;
    };
    for (const p of drops) add(p, 1);
    for (const d of drips) add(d, 0.45);
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
/** Splashes on impacts and hits. */
export class Particles {
  constructor() {
    this.max = 600;
    this.pos = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.size = new Float32Array(this.max);
    this.next = 0;
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.1, 6, 5),
      new THREE.MeshLambertMaterial(),
      this.max,
    );
    this.mesh.frustumCulled = false;
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < this.max; i++) {
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.setColorAt(i, col.set(0xffffff));
    }
  }
  burst(x, y, z, color, count, power) {
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const a = Math.random() * 6.28;
      const s = power * (0.3 + Math.random() * 0.7);
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y + 0.1;
      this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = power * (0.5 + Math.random() * 0.9);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.life[i] = 0.35 + Math.random() * 0.4;
      this.size[i] = 0.6 + Math.random() * 1.2;
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 18 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const s = this.life[i] > 0 ? this.size[i] * Math.min(1, this.life[i] * 5) : 0;
      dummy.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
