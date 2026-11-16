import * as THREE from './vendor/three.module.js';
// Inkwars – the visible character in a vinyl toy style: a pill body with a
// cap, heavy eyelids, thin arms and legs, big gloves and sneakers, plus
// fins, because it is half fish. The front is -z.
const SKINS = [0xf2a09a, 0x9bd6c6, 0xf4cf80, 0xc4b2ee];
const GLOVE = 0xf0894a;
const WHITE = 0xf7f6f2;
const DARK = 0x22242b;
function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
function shade(hex, f) {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}
/** Big eyes with half closed lids. */
function eyes(parent, x, y, z, r, lid) {
  const white = mat(0xffffff);
  const black = mat(DARK);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * x, y, z);
    const ball = mesh(new THREE.SphereGeometry(r, 14, 10), white);
    ball.scale.set(1, 1.1, 0.7);
    const lidM = mesh(
      new THREE.SphereGeometry(r * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.38),
      lid,
    );
    lidM.scale.set(1, 1.1, 0.75);
    lidM.rotation.x = -0.25;
    const pupil = mesh(
      new THREE.SphereGeometry(r * 0.36, 10, 8),
      black,
      sx * -r * 0.15,
      -r * 0.3,
      -r * 0.62,
    );
    eye.add(ball, lidM, pupil);
    parent.add(eye);
  }
}
/** A flat picture with a word on it (the "SOAKED!" above a character that is out). */
function wordSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.font = '900 92px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 18;
  g.strokeStyle = '#ffffff';
  g.strokeText(text, 256, 66);
  g.fillStyle = '#' + new THREE.Color(color).getHexString();
  g.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(2.8, 0.7, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// Going out ("soaked"), in seconds: the character swells up with the
// opponent's water, then bursts; a splash dome and a ring spread out, the
// cap flies off and stays on the floor, "SOAKED!" rises above the spot.
const SWELL = 0.16;
const BURST = 0.5;
const WORD = 1.6;

function cap(parent, r, m, dark) {
  const g = new THREE.Group();
  const dome = mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m);
  dome.scale.y = 0.8;
  const brim = mesh(new THREE.SphereGeometry(r * 0.8, 16, 8), dark, 0, 0.02, -r * 0.95);
  brim.scale.set(1, 0.1, 0.75);
  const button = mesh(new THREE.SphereGeometry(r * 0.1, 8, 6), dark, 0, r * 0.8, 0);
  g.add(dome, brim, button);
  parent.add(g);
  return g;
}
export class ActorView {
  /** color: the character's team colour, otherColor: the opponent's (for going out). */
  constructor(actor, color, otherColor = 0xffffff) {
    this.actor = actor;
    this.group = new THREE.Group();
    this.human = new THREE.Group();
    this.fishG = new THREE.Group();
    this.fishBody = new THREE.Group();
    this.legL = new THREE.Group();
    this.legR = new THREE.Group();
    this.armL = new THREE.Group();
    this.arms = new THREE.Group();
    this.torso = new THREE.Group();
    this.phase = Math.random() * 6;
    this.t = Math.random() * 10;
    const skinHex = SKINS[actor.id % SKINS.length];
    const skin = mat(skinHex);
    const lid = mat(shade(skinHex, 0.82));
    const team = mat(color);
    const teamDark = mat(shade(color, 0.72));
    const white = mat(WHITE);
    const dark = mat(DARK);
    const glove = mat(GLOVE);
    // ── Legs with socks and sneakers ──
    for (const [leg, sx] of [
      [this.legL, -1],
      [this.legR, 1],
    ]) {
      leg.position.set(sx * 0.17, 0.46, 0);
      leg.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8), skin, 0, -0.13, 0));
      leg.add(mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.1, 10), white, 0, -0.29, 0));
      const shoe = mesh(new THREE.SphereGeometry(0.15, 12, 10), team, 0, -0.38, -0.07);
      shoe.scale.set(0.9, 0.62, 1.6);
      const toe = mesh(new THREE.SphereGeometry(0.11, 10, 8), dark, 0, -0.39, -0.22);
      toe.scale.set(1.05, 0.7, 1);
      const sole = mesh(new THREE.BoxGeometry(0.25, 0.05, 0.46), white, 0, -0.44, -0.07);
      leg.add(shoe, toe, sole);
      this.human.add(leg);
    }
    // ── Pill body: shorts, shirt, head ──
    const R = 0.4;
    const hips = mesh(
      new THREE.SphereGeometry(R * 0.98, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      team,
      0,
      0.56,
      0,
    );
    hips.scale.y = 0.45;
    this.torso.add(hips);
    this.torso.add(mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.24, 20), team, 0, 0.68, 0));
    for (const sx of [-1, 1])
      this.torso.add(
        mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.16, 12), team, sx * 0.17, 0.44, 0),
      );
    this.torso.add(mesh(new THREE.CylinderGeometry(R * 1.07, R * 1.1, 0.44, 22), white, 0, 1.0, 0)); // shirt
    for (const sx of [-1, 1]) {
      const sleeve = mesh(
        new THREE.ConeGeometry(0.13, 0.17, 12, 1, true),
        white,
        sx * 0.46,
        1.12,
        0,
      );
      sleeve.rotation.z = sx * 1.15;
      this.torso.add(sleeve);
    }
    // Fish print on the shirt
    const logo = new THREE.Group();
    logo.position.set(0, 0.99, -R * 1.09);
    const lb = mesh(new THREE.SphereGeometry(0.12, 12, 8), team);
    lb.scale.set(1.25, 0.75, 0.15);
    const lt = mesh(new THREE.ConeGeometry(0.09, 0.12, 3), team, 0.19, 0, 0);
    lt.rotation.z = Math.PI / 2;
    lt.scale.z = 0.15;
    logo.add(lb, lt, mesh(new THREE.SphereGeometry(0.025, 6, 6), white, -0.08, 0.02, -0.02));
    this.torso.add(logo);
    this.torso.add(mesh(new THREE.CylinderGeometry(R, R, 0.3, 20), skin, 0, 1.36, 0));
    this.torso.add(
      mesh(new THREE.SphereGeometry(R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 1.5, 0),
    );
    eyes(this.torso, 0.16, 1.47, -0.33, 0.13, lid);
    const mouth = mesh(new THREE.SphereGeometry(0.13, 12, 8), mat(0x8c2f3a), 0.02, 1.29, -0.37);
    mouth.scale.set(1.25, 0.5, 0.35);
    const tongue = mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xf07f8f), 0.03, 1.27, -0.4);
    tongue.scale.set(1.1, 0.5, 0.3);
    this.torso.add(
      mouth,
      tongue,
      mesh(new THREE.BoxGeometry(0.07, 0.04, 0.03), white, 0.0, 1.325, -0.405),
    );
    const hat = cap(this.torso, R * 1.05, team, teamDark);
    hat.position.set(0, 1.56, 0);
    hat.rotation.set(-0.1, 0.25, 0.06);
    // Fins: ears, a crest through the cap, a tail
    for (const sx of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), lid, sx * 0.43, 1.36, 0.04);
      ear.rotation.z = -sx * 1.3;
      ear.scale.z = 0.3;
      this.torso.add(ear);
    }
    const crest = mesh(new THREE.ConeGeometry(0.2, 0.36, 4), lid, 0, 1.9, 0.16);
    crest.scale.x = 0.25;
    crest.rotation.x = 0.6;
    this.tail = mesh(new THREE.ConeGeometry(0.16, 0.34, 4), lid, 0, 0.74, 0.47);
    this.tail.rotation.x = -1.9;
    this.tail.scale.x = 0.3;
    this.torso.add(crest, this.tail);
    // The left arm hangs loose, with a bead bracelet and a glove
    this.armL.position.set(-0.5, 1.08, 0);
    this.armL.add(mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.42, 8), skin, 0, -0.21, 0));
    const braceletG = new THREE.TorusGeometry(0.065, 0.028, 6, 12);
    braceletG.rotateX(Math.PI / 2);
    this.armL.add(mesh(braceletG, dark, 0, -0.38, 0));
    const handL = mesh(new THREE.SphereGeometry(0.13, 12, 10), glove, 0, -0.52, 0);
    handL.scale.set(0.8, 1.15, 1);
    this.armL.add(handL);
    this.armL.rotation.z = -0.25;
    this.torso.add(this.armL);
    // The right arm holds the water pistol and follows the aim
    this.arms.position.set(0.48, 1.08, 0);
    const armG = new THREE.CylinderGeometry(0.042, 0.042, 0.42, 8);
    armG.rotateX(Math.PI / 2);
    this.arms.add(mesh(armG, skin, 0, 0, -0.21));
    const braceletR = new THREE.TorusGeometry(0.065, 0.028, 6, 12);
    this.arms.add(mesh(braceletR, dark, 0, 0, -0.36));
    this.arms.add(mesh(new THREE.SphereGeometry(0.13, 12, 10), glove, 0, 0, -0.48));
    const gun = new THREE.Group();
    gun.position.set(0, 0.08, -0.6);
    gun.add(mesh(new THREE.BoxGeometry(0.13, 0.16, 0.46), white));
    const nozzleG = new THREE.CylinderGeometry(0.04, 0.055, 0.2, 8);
    nozzleG.rotateX(Math.PI / 2);
    gun.add(mesh(nozzleG, dark, 0, 0.02, -0.32));
    gun.add(
      mesh(
        new THREE.SphereGeometry(0.15, 12, 10),
        new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.88 }),
        0,
        0.2,
        0.06,
      ),
    );
    this.arms.add(gun);
    this.torso.add(this.arms);
    this.human.add(this.torso);
    // ── Fish form: the same pill, lying down, with the cap ──
    const fb = mesh(new THREE.CapsuleGeometry(0.27, 0.42, 6, 14), skin);
    fb.rotation.x = Math.PI / 2;
    const band = mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.26, 18), white, 0, 0, 0.08);
    band.rotation.x = Math.PI / 2;
    this.fishTail = mesh(new THREE.ConeGeometry(0.3, 0.46, 4), team, 0, 0, 0.68);
    this.fishTail.rotation.x = -Math.PI / 2;
    this.fishTail.scale.x = 0.25;
    const fcap = cap(this.fishBody, 0.29, team, teamDark);
    fcap.position.set(0, 0.1, -0.2);
    fcap.rotation.set(-0.5, 0.2, 0);
    for (const sx of [-1, 1]) {
      const fin = mesh(new THREE.ConeGeometry(0.12, 0.28, 4), team, sx * 0.3, -0.08, 0.05);
      fin.rotation.z = -sx * 1.9;
      fin.scale.z = 0.3;
      this.fishBody.add(fin);
    }
    this.fishBody.add(fb, band, this.fishTail);
    eyes(this.fishBody, 0.12, 0.03, -0.42, 0.1, lid);
    this.fishBody.position.y = 0.32;
    this.fishG.add(this.fishBody);
    // Ripples while the fish is submerged
    const rg = new THREE.RingGeometry(0.28, 0.5, 20);
    rg.rotateX(-Math.PI / 2);
    this.ripple = new THREE.Mesh(
      rg,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    this.ripple.position.y = 0.04;
    this.group.add(this.human, this.fishG, this.ripple);
    this.group.scale.setScalar(0.88);

    // ── Going out (see SWELL, BURST, WORD) ──
    const water = (opacity) =>
      new THREE.MeshBasicMaterial({ color: otherColor, transparent: true, opacity, depthWrite: false });
    this.blob = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), water(0.85));
    this.blob.position.y = 0.8;
    const ringG = new THREE.RingGeometry(0.8, 1, 40);
    ringG.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringG, water(0.8));
    this.ring.position.y = 0.06;
    this.lostCap = new THREE.Group();
    cap(this.lostCap, R * 1.05, team, teamDark);
    this.capVel = new THREE.Vector3();
    this.word = wordSprite('SOAKED!', otherColor);
    this.group.add(this.blob, this.ring, this.lostCap, this.word);
    this.wasAlive = actor.alive;
    this.outT = 99;
    this.endOut();
  }
  /** The character just went out: start the animation where it stands now. */
  startOut() {
    this.outT = 0;
    this.lostCap.position.set(0, this.actor.morph > 0.5 ? 0.5 : 1.56, 0);
    this.lostCap.rotation.set(0, 0, 0);
    const side = Math.random() * Math.PI * 2;
    this.capVel.set(Math.cos(side) * 1.6, 6.5, Math.sin(side) * 1.6);
  }
  /** Back in the game: everything of the animation disappears. */
  endOut() {
    this.blob.visible = false;
    this.ring.visible = false;
    this.lostCap.visible = false;
    this.word.visible = false;
  }
  /** One frame of going out; the group stays where the character went out. */
  updateOut(dt) {
    const t = (this.outT += dt);
    this.group.visible = true;
    this.ripple.visible = false;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (t < SWELL) {
      // swelling up, a little wobbly, while the opponent's water closes in
      const k = t / SWELL;
      const wob = still ? 0 : Math.sin(t * 70) * 0.06;
      const body = this.actor.morph < 0.5 ? this.human : this.fishG;
      const base = body === this.human ? 1 : Math.max(0.001, this.actor.morph);
      body.scale.set(base * (1 + 0.55 * k + wob), base * (1 - 0.2 * k), base * (1 + 0.55 * k + wob));
      this.blob.visible = true;
      this.blob.scale.setScalar(0.3 + 0.9 * k);
      this.blob.material.opacity = 0.35 + 0.5 * k;
    } else {
      // burst: the body is gone, the water spreads and fades
      this.human.visible = false;
      this.fishG.visible = false;
      const k = Math.min(1, (t - SWELL) / (BURST - SWELL));
      this.blob.visible = k < 1;
      this.blob.scale.set(1.2 + 1.2 * k, 1.2 * (1 - k * 0.8), 1.2 + 1.2 * k);
      this.blob.material.opacity = 0.85 * (1 - k);
      this.ring.visible = k < 1;
      this.ring.scale.setScalar(1 + 2 * k);
      this.ring.material.opacity = 0.8 * (1 - k);
      // the cap flies off and stays where it lands
      this.lostCap.visible = true;
      if (this.capVel.y !== 0 || this.lostCap.position.y > 0.05) {
        this.capVel.y -= 18 * dt;
        this.lostCap.position.addScaledVector(this.capVel, dt);
        if (!still) this.lostCap.rotation.x += dt * 9;
        if (this.lostCap.position.y <= 0.05) {
          this.lostCap.position.y = 0.05;
          this.capVel.set(0, 0, 0);
          this.lostCap.rotation.set(0, this.lostCap.rotation.y, 0.35);
        }
      }
    }
    // the word rises and fades
    this.word.visible = t < WORD;
    if (this.word.visible) {
      const pop = Math.min(1, t / 0.12);
      this.word.position.y = 2.3 + (still ? 0 : t * 0.6);
      this.word.scale.set(2.8 * pop, 0.7 * pop, 1);
      this.word.material.opacity = Math.min(1, (WORD - t) / 0.4);
    }
  }
  update(dt, viewerTeam) {
    const a = this.actor;
    this.t += dt;
    if (!a.alive) {
      if (this.wasAlive) this.startOut();
      this.wasAlive = false;
      this.updateOut(dt);
      return;
    }
    if (!this.wasAlive) this.endOut();
    this.wasAlive = true;
    this.group.visible = a.invuln > 0 ? Math.floor(this.t * 12) % 2 === 0 : true;
    this.group.position.copy(a.pos);
    this.group.rotation.y = a.yaw;
    const m = a.morph;
    const speed = Math.hypot(a.vel.x, a.vel.z);
    const friendly = a.team === viewerTeam;
    // The change: the human collapses, the fish pops up
    this.human.visible = m < 0.98;
    this.human.scale.set(1 - m * 0.6, Math.max(0.02, 1 - m), 1 - m * 0.6);
    const fs = Math.max(0.001, m) * (1 + 0.25 * Math.sin(m * Math.PI));
    this.fishG.scale.setScalar(fs);
    const hidden = a.submerged;
    this.fishG.visible = m > 0.02 && !(hidden && !a.climbing) && !(hidden && !friendly);
    this.ripple.visible = hidden && !a.climbing && (friendly || speed > 7);
    if (this.ripple.visible) {
      const pulse = 1 + 0.25 * Math.sin(this.t * 9) + Math.min(1, speed / 12) * 0.6;
      this.ripple.scale.set(pulse, 1, pulse);
      this.ripple.material.opacity = friendly ? 0.55 : 0.22;
    }
    // human form: Laufanimation
    if (this.human.visible) {
      const k = a.grounded ? Math.min(1, speed / 4) : 0.3;
      this.phase += speed * dt * 2.4;
      const sw = Math.sin(this.phase) * 0.9 * k;
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      this.armL.rotation.x = -sw * 0.8;
      this.torso.position.y = Math.abs(Math.cos(this.phase)) * 0.06 * k;
      this.torso.rotation.z = Math.sin(this.phase) * 0.07 * k;
      this.torso.rotation.x = -Math.min(0.2, speed * 0.02);
      this.tail.rotation.y = Math.sin(this.t * 6) * 0.3;
      this.arms.rotation.x = a.input.aimPitch;
    }
    // Fish form
    if (this.fishG.visible) {
      const fb = this.fishBody;
      this.fishTail.rotation.y = Math.sin(this.t * 18) * 0.6;
      if (a.climbing) {
        fb.rotation.set(Math.PI / 2, 0, 0);
        fb.position.y = 0.4;
      } else if (!a.grounded) {
        fb.rotation.set(Math.max(-1, Math.min(1, a.vel.y * 0.09)), 0, 0);
        fb.position.y = 0.32;
      } else {
        // flop around on dry ground
        const flop = Math.sin(this.t * 11);
        fb.rotation.set(0, 0, flop * 0.55);
        fb.position.y = 0.3 + Math.abs(flop) * 0.22;
      }
    }
  }
}
