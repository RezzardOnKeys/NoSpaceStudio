// Blind Drop – short-lived things: smoke puffs, comic words ("BOOM!"),
// falling bombs, explosions, and the aim circle of the local player.

import * as THREE from './vendor/three.module.js';
import { BLAST_SIZES, DEFAULT_BLAST } from './config.js';
import { INK, toon, flat, outlined, onGround } from './look.js';

const puffGeo = new THREE.SphereGeometry(1, 10, 8);
const puffMat = toon(0xffffff);
const bombGeo = new THREE.SphereGeometry(0.55, 20, 14);
const bandGeo = new THREE.TorusGeometry(0.55, 0.09, 8, 28);
const capGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.26, 10);
const sparkGeo = new THREE.SphereGeometry(0.16, 8, 6);
const bombMat = toon(0x34304a);
const sparkMat = flat(0xffe03a);

/** Overshoots a little and settles: makes things "pop". k runs from 0 to 1. */
function backOut(k) {
  const s = 2.2;
  const t = k - 1;
  return t * t * ((s + 1) * t + s) + 1;
}

/** A jagged star, the classic comic explosion shape. */
function starGeometry(spikes, outer, inner) {
  const shape = new THREE.Shape();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer * (0.82 + Math.random() * 0.3) : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(shape);
}

/**
 * ctx: { scene, camera, labelLayer, project(x, y, z), shake(seconds, power),
 *        isDrawing() }
 * isDrawing() is false while the tab is in the background and no frames are
 * drawn. New effects are skipped then; otherwise they would pile up and all
 * play at once when the player comes back.
 */
export function createEffects(ctx) {
  const { scene, camera, labelLayer, project, shake, isDrawing } = ctx;

  // Each effect is { age, dur, step(k), end() }; k runs from 0 to 1.
  const effects = [];
  function addEffect(dur, step, end) {
    effects.push({ age: 0, dur, step, end });
  }

  // ---- Smoke and comic words ---------------------------------------------
  function puffs(x, y, z, count, reach, size) {
    for (let i = 0; i < count; i++) {
      const puff = outlined(new THREE.Mesh(puffGeo, puffMat), 0.12);
      const a = (i / count) * Math.PI * 2 + Math.random();
      const dir = new THREE.Vector3(Math.cos(a), 0.3 + Math.random() * 0.8, Math.sin(a));
      const far = reach * (0.6 + Math.random() * 0.6);
      const s = size * (0.6 + Math.random() * 0.7);
      scene.add(puff);
      addEffect(
        0.55 + Math.random() * 0.35,
        (k) => {
          const out = 1 - (1 - k) * (1 - k);
          puff.position.set(x + dir.x * far * out, y + dir.y * far * out, z + dir.z * far * out);
          puff.scale.setScalar(s * (k < 0.25 ? k * 4 : 1 - (k - 0.25) / 0.75) + 0.001);
        },
        () => scene.remove(puff),
      );
    }
  }

  /** A comic word that pops up at a place in the world. `scale` shrinks it. */
  function comicText(text, x, y, z, color, { small = false, scale = 1 } = {}) {
    const el = document.createElement('div');
    el.className = small ? 'comic small' : 'comic';
    el.textContent = text;
    const at = project(x, y, z);
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    el.style.setProperty('--c', color);
    el.style.setProperty('--k', String(scale));
    el.style.setProperty('--tilt', `${Math.round(Math.random() * 24 - 12)}deg`);
    el.addEventListener('animationend', () => el.remove());
    labelLayer.appendChild(el);
  }

  /** A small cloud, optionally with a word ("POOF!", "ZAP!"). */
  function poof(x, z, color, word) {
    if (!isDrawing()) return;
    puffs(x, 0.8, z, 6, 1.3, 0.42);
    if (word) comicText(word, x, 2.4, z, color, { small: true });
  }

  // ---- Blast zone ----------------------------------------------------------
  // The blast size is chosen per match. Ground circles are made once per size
  // and kept, because only a few sizes exist.
  let blastR = BLAST_SIZES[DEFAULT_BLAST].r;
  const zoneGeos = new Map();
  function zoneGeometry(r) {
    if (!zoneGeos.has(r)) {
      zoneGeos.set(r, {
        disc: new THREE.CircleGeometry(r, 56),
        ring: new THREE.RingGeometry(r - 0.16, r, 56),
      });
    }
    return zoneGeos.get(r);
  }

  /** Flat circle on the ground that shows exactly what a bomb reaches. */
  function makeZone(color, fill) {
    const group = new THREE.Group();
    const geo = zoneGeometry(blastR);
    const discMat = flat(color, { transparent: true, opacity: fill, depthWrite: false });
    const ringMat = flat(color, { transparent: true, opacity: 1, depthWrite: false });
    const disc = onGround(geo.disc, discMat);
    const rim = onGround(geo.ring, ringMat);
    rim.position.y = 0.01;
    group.add(disc, rim);
    return { group, disc, rim, discMat, ringMat };
  }

  // ---- Explosion and bomb --------------------------------------------------
  function explode(x, z, color) {
    // 1. The ground lights up where the blast reaches.
    const zone = makeZone(color, 0.8);
    zone.group.position.set(x, 0.07, z);
    scene.add(zone.group);
    addEffect(
      1.3,
      (k) => {
        zone.discMat.opacity = 0.8 * (1 - k);
        zone.ringMat.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      },
      () => {
        scene.remove(zone.group);
        zone.discMat.dispose();
        zone.ringMat.dispose();
      },
    );

    // 2. The star burst: ink, player colour, yellow, white. It always faces
    //    the camera and is drawn on top of everything, like in a comic.
    const burst = new THREE.Group();
    const layers = [
      [starGeometry(13, blastR * 0.98, blastR * 0.6), INK],
      [starGeometry(13, blastR * 0.86, blastR * 0.52), color],
      [starGeometry(11, blastR * 0.56, blastR * 0.32), 0xffe03a],
      [starGeometry(9, blastR * 0.3, blastR * 0.16), 0xffffff],
    ].map(([geo, c], order) => {
      const mesh = new THREE.Mesh(geo, flat(c, { transparent: true, depthTest: false }));
      mesh.renderOrder = 10 + order;
      mesh.rotation.z = Math.random() * 0.5;
      burst.add(mesh);
      return mesh;
    });
    burst.position.set(x, 1.5, z);
    burst.quaternion.copy(camera.quaternion);
    scene.add(burst);
    addEffect(
      0.95,
      (k) => {
        const pop = k < 0.18 ? backOut(k / 0.18) : 1 + (k - 0.18) * 0.12;
        burst.scale.setScalar(Math.max(pop, 0.001));
        const alpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
        layers.forEach((mesh, i) => {
          mesh.material.opacity = alpha;
          mesh.rotation.z += i % 2 === 0 ? 0.004 : -0.006;
        });
      },
      () => {
        scene.remove(burst);
        layers.forEach((mesh) => {
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
      },
    );

    // 3. Smoke, the word and a shaking camera. Small blasts get a smaller
    //    word, so it does not hide where they hit.
    puffs(x, 0.9, z, 10, blastR * 1.15, 0.95);
    comicText('BOOM!', x, 3.6, z, color, { scale: Math.min(1, 0.4 + blastR * 0.2) });
    shake(0.5, 0.55);
  }

  /** A bomb falls from the sky onto (x, z) and explodes in the given colour. */
  function dropBomb(x, z, color, fallMs) {
    if (!isDrawing()) return;
    const bomb = new THREE.Group();
    bomb.add(outlined(new THREE.Mesh(bombGeo, bombMat), 0.08));
    const bandMat = toon(color);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = Math.PI / 2;
    const cap = outlined(new THREE.Mesh(capGeo, bombMat), 0.05);
    cap.position.y = 0.6;
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.y = 0.86;
    bomb.add(band, cap, spark);
    scene.add(bomb);

    const zone = makeZone(color, 0.22);
    zone.group.position.set(x, 0.06, z);
    scene.add(zone.group);

    addEffect(
      fallMs / 1000,
      (k) => {
        bomb.position.set(x, 0.55 + (1 - k * k) * 26, z);
        bomb.rotation.set(k * 5, 0, Math.sin(k * 9) * 0.3);
        spark.scale.setScalar(0.7 + Math.random() * 0.8);
        zone.discMat.opacity = 0.15 + k * 0.3;
      },
      () => {
        scene.remove(bomb, zone.group);
        bandMat.dispose();
        zone.discMat.dispose();
        zone.ringMat.dispose();
        explode(x, z, color);
      },
    );
  }

  // ---- Aim circle (only for the local player) ------------------------------
  const aim = makeZone(0xffffff, 0.2);
  const aimDot = onGround(new THREE.CircleGeometry(0.18, 16), aim.ringMat);
  aimDot.position.y = 0.01;
  aim.group.add(aimDot);
  // Snipe: four short bars around the circle, like a scope. Built for a
  // blast radius of 1 and scaled with the blast size.
  const crosshair = new THREE.Group();
  for (const turn of [0, Math.PI / 2]) {
    for (const side of [-1, 1]) {
      const bar = onGround(new THREE.PlaneGeometry(0.9, 0.07), aim.ringMat);
      bar.rotation.z = turn;
      bar.position.set(turn ? 0 : side * 1.05, 0.01, turn ? side * 1.05 : 0);
      crosshair.add(bar);
    }
  }
  crosshair.visible = false;
  aim.group.add(crosshair);
  aim.group.visible = false;
  scene.add(aim.group);
  let aimPlaced = false;

  /** mode: 'off', 'aim' (follows the mouse) or 'placed' (bomb is set). */
  function setAim(mode, x, z, color) {
    aim.group.visible = mode !== 'off';
    if (mode === 'off') return;
    aim.group.position.set(x, 0.06, z);
    aim.discMat.color.set(color);
    aim.ringMat.color.set(color);
    aimPlaced = mode === 'placed';
  }

  /** Shows or hides the scope bars around the aim circle (Snipe look). */
  function setCrosshair(on) {
    crosshair.visible = on;
  }

  /** Sets the explosion radius for everything drawn from now on. */
  function setBlast(r) {
    blastR = r;
    const geo = zoneGeometry(r);
    aim.disc.geometry = geo.disc;
    aim.rim.geometry = geo.ring;
    crosshair.scale.setScalar(r);
  }

  /** Advances all running effects by dt seconds. */
  function update(dt, time) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.age += dt;
      if (e.age >= e.dur) {
        effects.splice(i, 1);
        e.end();
      } else {
        e.step(e.age / e.dur);
      }
    }
    if (aim.group.visible) {
      aim.discMat.opacity = aimPlaced ? 0.45 + Math.sin(time * 9) * 0.12 : 0.2;
    }
  }

  return { poof, dropBomb, setAim, setCrosshair, setBlast, update };
}
