// Dust Dash – moving things that are only for looks: the delivery (a hatch
// in the roof that opens, a beam of light on the spot, the cardboard box
// that falls and bounces a little, sparkles when somebody opens it) and the
// dust that floats in the sunlight near the front windows. When and where
// a box drops is decided by the rules (sim.js).

import * as THREE from './vendor/three.module.js';
import { toon, flat, outlined } from './look.js';

const BOX = 0.9; // edge of the cardboard box
const SPARKS = 28;
const MOTES = 520; // specks of dust floating in the sunbeams

/** calm: the player asked the system for less motion (no bouncing). */
export function createEffects(hall, calm) {
  const group = new THREE.Group();
  const H = hall.H;

  // ---- The hatch in the roof: bright sky behind two flaps -------------------
  const hatch = new THREE.Group();
  hatch.position.y = H - 0.03;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), flat(0xfff6d6));
  sky.rotation.x = Math.PI / 2;
  hatch.add(sky);
  const flaps = [-1, 1].map((side) => {
    // The hinge sits at the outer edge; the flap hangs down when open.
    const hinge = new THREE.Group();
    hinge.position.set(side * 0.85, -0.02, 0);
    const flap = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 1.7), toon(0x7a4a26)), 0.03);
    flap.position.x = -side * 0.425;
    hinge.add(flap);
    hatch.add(hinge);
    return { hinge, side };
  });
  group.add(hatch);

  // ---- The beam of light from the hatch to the floor ----------------------------
  const glow = flat(0xffe7a0, {
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, H, 24, 1, true), glow);
  beam.position.y = H / 2;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), glow);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02;
  group.add(beam, pool);

  // ---- The cardboard box with packing tape ------------------------------------
  const box = new THREE.Group();
  const card = outlined(new THREE.Mesh(new THREE.BoxGeometry(BOX, BOX, BOX), toon(0xc99a5b)), 0.04);
  card.castShadow = true;
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.22, BOX + 0.02, BOX + 0.02), toon(0xf1e2bd));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), flat(0xfbf3df));
  label.position.set(0.24, 0.1, BOX / 2 + 0.012);
  box.add(card, tape, label);
  group.add(box);

  // ---- Sparkles when a box is opened ---------------------------------------------
  const sparkColors = [0xffe07a, 0xfff3c8, 0xf08a24, 0xffffff];
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), flat(sparkColors[i % 4]));
    mesh.visible = false;
    group.add(mesh);
    sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  // ---- Dust floating in the light of the front windows --------------------------
  const motePos = new Float32Array(MOTES * 3);
  const moteHome = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    moteHome[i * 3] = (Math.random() * 2 - 1) * (hall.hw - 0.5);
    moteHome[i * 3 + 1] = 0.3 + Math.random() * 4.4;
    moteHome[i * 3 + 2] = hall.hd - 0.5 - Math.random() * 7;
  }
  motePos.set(moteHome);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  // Each speck is a small soft dot (drawn once on a canvas).
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const dg = dot.getContext('2d');
  const fade = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
  fade.addColorStop(0, 'rgba(255,255,255,1)');
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = fade;
  dg.fillRect(0, 0, 32, 32);
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0xfff0c4,
      map: new THREE.CanvasTexture(dot),
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  motes.frustumCulled = false;
  group.add(motes);

  let open = 0; // how far the hatch is open, 0..1
  let landed = 9; // seconds since the box touched the floor
  let lastState = 'timer';

  return {
    group,

    /** A box was opened at (x, z): sparkles fly out. */
    burst(x, z) {
      sparks.forEach((s, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        s.mesh.position.set(x, 0.5, z);
        s.mesh.visible = true;
        s.vx = Math.cos(a) * speed;
        s.vz = Math.sin(a) * speed;
        s.vy = 3 + Math.random() * 4;
        s.life = 0.6 + Math.random() * 0.4;
      });
    },

    /** d: the delivery of the rules ({ state, x, z, fall }); time: seconds, for the glow. */
    update(dt, d, time) {
      // Every speck drifts slowly around its own place.
      if (!calm) {
        for (let i = 0; i < MOTES; i++) {
          motePos[i * 3] = moteHome[i * 3] + Math.sin(time * 0.21 + i) * 0.35;
          motePos[i * 3 + 1] = moteHome[i * 3 + 1] + Math.sin(time * 0.33 + i * 1.7) * 0.25;
          motePos[i * 3 + 2] = moteHome[i * 3 + 2] + Math.cos(time * 0.17 + i * 0.6) * 0.3;
        }
        moteGeo.attributes.position.needsUpdate = true;
      }

      const there = d.state !== 'timer';
      if (d.state === 'waiting' && lastState !== 'waiting') landed = 0;
      lastState = d.state;
      landed += dt;

      // The hatch opens for the box and closes again afterwards.
      open += ((there ? 1 : 0) - open) * Math.min(1, dt * 6);
      hatch.visible = open > 0.02;
      for (const f of flaps) f.hinge.rotation.z = -f.side * open * 1.35;
      beam.visible = pool.visible = there;
      box.visible = there;
      if (there) {
        hatch.position.x = beam.position.x = pool.position.x = box.position.x = d.x;
        hatch.position.z = beam.position.z = pool.position.z = box.position.z = d.z;
        glow.opacity = 0.17 + (calm ? 0 : Math.sin(time * 3) * 0.04);
        // Falling faster and faster, then two small bounces on the floor.
        let y = (H - 1) * (1 - d.fall * d.fall);
        let squash = 1;
        if (d.state === 'waiting' && !calm && landed < 0.9) {
          y = Math.abs(Math.sin(landed * 10)) * 0.28 * (1 - landed / 0.9);
          squash = 1 - 0.12 * Math.max(0, 1 - landed * 6);
        }
        box.position.y = y + (BOX / 2) * squash;
        box.scale.set(1 + (1 - squash) * 0.6, squash, 1 + (1 - squash) * 0.6);
        box.rotation.y = d.x * 0.7 + d.z * 0.3; // every box lies a little differently
      }

      for (const s of sparks) {
        if (s.life <= 0) continue;
        s.life -= dt;
        s.vy -= 12 * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y = Math.max(0.05, s.mesh.position.y + s.vy * dt);
        s.mesh.position.z += s.vz * dt;
        s.mesh.rotation.x += dt * 9;
        s.mesh.rotation.y += dt * 7;
        s.mesh.scale.setScalar(Math.max(0, Math.min(1, s.life * 3)));
        if (s.life <= 0) s.mesh.visible = false;
      }
    },
  };
}
