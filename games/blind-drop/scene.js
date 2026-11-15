// Blind Drop – everything you can see: island, characters, bombs, explosions.
// This file only draws. It knows nothing about rules or the network; game.js
// tells it what to show.

import * as THREE from './vendor/three.module.js';
import { ISLAND_R, BLAST_SIZES, DEFAULT_BLAST } from './config.js';

const INK = 0x1b1033; // colour of the thick comic outlines

export function createView(canvas, labelLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 1, 1200);
  // Fixed view from the side above. The player cannot change it. The narrow
  // lens (22°) keeps the rocky underside visible below the grass.
  const CAM_DIR = new THREE.Vector3(0, 0.6, 0.8).normalize();
  const CAM_TARGET = new THREE.Vector3(0, -2.2, 0);
  const camBase = new THREE.Vector3();
  let width = 1;
  let height = 1;
  let time = 0;
  let shakeLeft = 0;
  let shakePower = 0;

  const sky = new THREE.HemisphereLight(0xffffff, 0x8a7bd8, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-7, 12, 6);
  scene.add(sky, sun);

  // Two looks: "classic" (bright, grass) and "snipe" (night, stone range).
  // Everything that differs between them is listed here and applied by
  // setTheme() further down.
  const THEMES = {
    classic: {
      skyTop: 0xffffff, skyBottom: 0x8a7bd8, skyPower: 1.5, sun: 0xffffff, sunPower: 2.4,
      top: 0x66dd52, dirt: 0xa9623a, rock: 0x8576a3,
      stars: [0xffffff, 0xfff3a6, 0x9fe8ff], starShare: 1,
    },
    snipe: {
      // Almost the same light as classic, so the characters keep their
      // strong colours; the darkness comes from the ground and the sky.
      skyTop: 0xe9f0ff, skyBottom: 0x3a4660, skyPower: 1.4, sun: 0xf2f6ff, sunPower: 2.3,
      top: 0x2c3644, dirt: 0x1d2430, rock: 0x131821,
      stars: [0xc9dcff, 0x86a9cf, 0x6585ab], starShare: 0.45,
    },
  };

  // ---- Toon look -------------------------------------------------------
  // A tiny 3-pixel texture turns smooth shading into three hard steps.
  const steps = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
  steps.minFilter = THREE.NearestFilter;
  steps.magFilter = THREE.NearestFilter;
  steps.needsUpdate = true;
  const toon = (color, extra) =>
    new THREE.MeshToonMaterial({ color, gradientMap: steps, ...extra });
  const flat = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });

  // Outline trick ("inverted hull"): draw the same shape again, slightly
  // bigger, in ink colour and inside out. Only its rim stays visible.
  const inkMat = flat(INK, { side: THREE.BackSide });
  function outlined(mesh, thickness = 0.07) {
    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    const hull = new THREE.Mesh(mesh.geometry, inkMat);
    hull.scale.set(
      (size.x + thickness * 2) / size.x,
      (size.y + thickness * 2) / size.y,
      (size.z + thickness * 2) / size.z,
    );
    mesh.add(hull);
    return mesh;
  }

  // Repeatable "random" numbers, so the island looks the same for everyone.
  function seeded(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  // ---- Space -----------------------------------------------------------
  const space = new THREE.Group();
  scene.add(space);
  const CAM_UP = new THREE.Vector3(0, CAM_DIR.z, -CAM_DIR.y);
  /** A point behind the island as the camera sees it: right, up, how far away. */
  const backdrop = (right, up, depth) =>
    new THREE.Vector3(right, 0, 0).addScaledVector(CAM_UP, up).addScaledVector(CAM_DIR, -depth);
  {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath(); // a four-pointed comic sparkle
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 30 : 7;
      const a = (i / 8) * Math.PI * 2;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.fill();
    const sparkle = new THREE.CanvasTexture(c);
    const rnd = seeded(7);
    space.userData.layers = [];
    for (const [count, size, color] of [
      [700, 5, 0xffffff],
      [160, 11, 0xfff3a6],
      [90, 9, 0x9fe8ff],
    ]) {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        // A flat field of stars far behind the island, facing the camera.
        const v = backdrop((rnd() - 0.5) * 420, (rnd() - 0.5) * 420, 420);
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const layer = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          map: sparkle,
          size,
          color,
          sizeAttenuation: false,
          transparent: true,
          depthWrite: false,
        }),
      );
      layer.userData.count = count;
      space.userData.layers.push(layer);
      space.add(layer);
    }
  }
  // Two comic planets in the background.
  const planetA = outlined(new THREE.Mesh(new THREE.SphereGeometry(11, 32, 20), toon(0xff8a3c)), 0.6);
  planetA.position.copy(backdrop(-52, -16, 220));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, 1.2, 8, 48), toon(0xffe08a));
  ring.rotation.x = 1.2;
  ring.scale.z = 0.3;
  planetA.add(outlined(ring, 0.4));
  const planetB = outlined(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), toon(0x57c8ff)), 0.5);
  planetB.position.copy(backdrop(54, 22, 240));
  scene.add(planetA, planetB);
  // Snipe shows one big pale moon instead.
  const moon = outlined(new THREE.Mesh(new THREE.SphereGeometry(15, 32, 20), toon(0xdfe7f3)), 0.6);
  moon.position.copy(backdrop(50, 20, 240));
  for (const [x, y, r] of [[-5, 4, 3.2], [4, -3, 2.2], [6, 6, 1.5], [-3, -7, 1.8]]) {
    const crater = new THREE.Mesh(new THREE.CircleGeometry(r, 20), flat(0xb9c4d6));
    // Craters sit on the side of the moon that faces the camera.
    const dir = new THREE.Vector3(x, 0, 0).addScaledVector(CAM_UP, y);
    crater.position.copy(dir).addScaledVector(CAM_DIR, Math.sqrt(15 * 15 - x * x - y * y) + 0.05);
    crater.lookAt(crater.position.clone().add(CAM_DIR));
    moon.add(crater);
  }
  moon.visible = false;
  scene.add(moon);

  // ---- Island ----------------------------------------------------------
  // Built at the starting size; shrinking only scales this group.
  const island = new THREE.Group();
  scene.add(island);
  let islandScale = 1;
  let islandTarget = 1;
  const topMat = toon(0x66dd52);
  /** Classic only: darker spots in the grass. */
  const patches = new THREE.Group();
  const dirtMat = toon(0xa9623a);
  const rockMat = toon(0x8576a3);
  /** Snipe only: lines painted on the stone like the view through a scope. */
  const reticle = new THREE.Group();
  {
    const grass = outlined(
      new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 0.36, 72), topMat),
      0.13,
    );
    grass.position.y = -0.18;
    island.add(grass);

    const lineMat = flat(0x9db3c9, { transparent: true, opacity: 0.5, depthWrite: false });
    const redMat = flat(0xff3b3b, { transparent: true, opacity: 0.85, depthWrite: false });
    const flatMesh = (geo, mat) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };
    for (const share of [0.25, 0.5, 0.75, 0.97]) {
      const r = ISLAND_R * share;
      reticle.add(flatMesh(new THREE.RingGeometry(r - 0.04, r + 0.04, 96), lineMat));
    }
    for (const turn of [0, Math.PI / 2]) {
      const line = flatMesh(new THREE.PlaneGeometry(ISLAND_R * 1.94, 0.08), lineMat);
      line.rotation.z = turn;
      reticle.add(line);
    }
    // Small tick marks along the cross, one per unit.
    for (let i = 1; i < ISLAND_R; i++) {
      for (const [x, z, turn] of [[i, 0, Math.PI / 2], [-i, 0, Math.PI / 2], [0, i, 0], [0, -i, 0]]) {
        const tick = flatMesh(new THREE.PlaneGeometry(i % 5 === 0 ? 0.9 : 0.45, 0.06), lineMat);
        tick.rotation.z = turn;
        tick.position.set(x, 0, z);
        reticle.add(tick);
      }
    }
    reticle.add(flatMesh(new THREE.CircleGeometry(0.22, 20), redMat));
    reticle.position.y = 0.025;
    reticle.visible = false;
    island.add(reticle);

    const rnd = seeded(42);
    const patchMat = flat(0x52c943);
    island.add(patches);
    for (let i = 0; i < 9; i++) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.6 + rnd() * 1.1, 24), patchMat);
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * ISLAND_R * 0.8;
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d);
      patches.add(patch);
    }

    const dirt = outlined(
      new THREE.Mesh(
        new THREE.CylinderGeometry(ISLAND_R * 0.995, ISLAND_R * 0.9, 1.3, 30),
        dirtMat,
      ),
      0.1,
    );
    dirt.position.y = -1.0;
    island.add(dirt);

    // Rocky underside: an upside-down cone with dented, faceted sides.
    const rockGeo = new THREE.ConeGeometry(ISLAND_R * 0.9, 13, 14, 7);
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      // The same input gives the same dent, so the seam of the cone stays closed.
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      const dent = 0.82 + (n - Math.floor(n)) * 0.36;
      p.setXYZ(i, x * dent, y, z * dent);
    }
    rockGeo.rotateX(Math.PI);
    // Separate corners per triangle give the hard, faceted rock look.
    const facets = rockGeo.toNonIndexed();
    facets.computeVertexNormals();
    const rock = outlined(new THREE.Mesh(facets, rockMat), 0.14);
    rock.position.y = -8.1;
    island.add(rock);
  }

  // A few loose rocks drifting next to the island.
  const drifters = [];
  {
    const rnd = seeded(99);
    for (let i = 0; i < 6; i++) {
      const rockMesh = outlined(
        new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rnd() * 0.7, 0), rockMat),
        0.08,
      );
      const a = rnd() * Math.PI * 2;
      const d = ISLAND_R + 2.5 + rnd() * 5;
      rockMesh.position.set(Math.cos(a) * d, -2 - rnd() * 6, Math.sin(a) * d);
      rockMesh.userData = { baseY: rockMesh.position.y, phase: rnd() * 6, spin: 0.2 + rnd() * 0.5 };
      scene.add(rockMesh);
      drifters.push(rockMesh);
    }
  }

  // ---- Characters ------------------------------------------------------
  const chars = new Map(); // player id -> character
  const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.5, 6, 18);
  const eyeGeo = new THREE.SphereGeometry(0.14, 12, 10);
  const pupilGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const footGeo = new THREE.SphereGeometry(0.17, 10, 8);
  const shadowGeo = new THREE.CircleGeometry(0.55, 24);
  const shadowMat = flat(0x000000, { transparent: true, opacity: 0.28, depthWrite: false });
  const whiteMat = flat(0xffffff);
  const blackMat = flat(INK);

  function makeCharacter(id) {
    const group = new THREE.Group();
    const rig = new THREE.Group();
    group.add(rig);
    const mat = toon(0xffffff);
    const body = outlined(new THREE.Mesh(bodyGeo, mat), 0.075);
    body.position.y = 0.72;
    rig.add(body);
    for (const side of [-1, 1]) {
      const eye = outlined(new THREE.Mesh(eyeGeo, whiteMat), 0.03);
      eye.position.set(side * 0.17, 0.95, 0.34);
      const pupil = new THREE.Mesh(pupilGeo, blackMat);
      pupil.position.set(side * 0.17, 0.95, 0.45);
      const foot = outlined(new THREE.Mesh(footGeo, mat), 0.05);
      foot.position.set(side * 0.2, 0.12, 0.1);
      foot.scale.set(1, 0.7, 1.3);
      rig.add(eye, pupil, foot);
    }
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    group.add(shadow);
    group.scale.setScalar(1.3);
    scene.add(group);

    const tag = document.createElement('div');
    tag.className = 'tag';
    labelLayer.appendChild(tag);

    return {
      id, group, rig, mat, shadow, tag,
      mode: 'idle', // idle | cheer | ko
      moving: false,
      walk: 0,
      face: 0,
      faceTarget: 0,
      vel: new THREE.Vector3(),
      phase: Math.random() * 6,
    };
  }

  /** Creates, recolours and removes characters so they match the player list. */
  function setPlayers(list) {
    for (const [id, c] of chars) {
      if (list.some((p) => p.id === id)) continue;
      scene.remove(c.group);
      c.mat.dispose();
      c.tag.remove();
      chars.delete(id);
    }
    for (const p of list) {
      let c = chars.get(p.id);
      if (!c) {
        c = makeCharacter(p.id);
        chars.set(p.id, c);
      }
      c.mat.color.set(p.color);
      c.tag.textContent = p.label;
      c.tag.style.setProperty('--c', p.color);
    }
  }

  function resetPose(id) {
    const c = chars.get(id);
    if (!c) return;
    c.mode = 'idle';
    c.moving = false;
    c.group.position.y = 0;
    c.rig.rotation.set(0, c.face, 0);
    c.rig.position.y = 0;
    c.rig.scale.set(1, 1, 1);
    c.shadow.visible = true;
  }

  function place(id, x, z) {
    const c = chars.get(id);
    if (c) c.group.position.set(x, c.mode === 'ko' ? c.group.position.y : 0, z);
  }

  function setVisible(id, visible) {
    const c = chars.get(id);
    if (c) c.group.visible = visible;
  }

  /** Tells a character whether it walks and in which direction it looks. */
  function setMoving(id, dx, dz) {
    const c = chars.get(id);
    if (!c) return;
    c.moving = dx !== 0 || dz !== 0;
    if (c.moving) c.faceTarget = Math.atan2(dx, dz);
  }

  /** Blown away by a bomb at (fromX, fromZ). */
  function knockout(id, fromX, fromZ) {
    const c = chars.get(id);
    if (!c || c.mode === 'ko') return;
    let dx = c.group.position.x - fromX;
    let dz = c.group.position.z - fromZ;
    const d = Math.hypot(dx, dz);
    if (d < 0.01) {
      const a = Math.random() * Math.PI * 2;
      dx = Math.cos(a);
      dz = Math.sin(a);
    } else {
      dx /= d;
      dz /= d;
    }
    c.mode = 'ko';
    c.vel.set(dx * 9, 17, dz * 9);
    c.shadow.visible = false;
  }

  function cheer(id) {
    const c = chars.get(id);
    if (c && c.mode !== 'ko') c.mode = 'cheer';
  }

  // ---- Effects ---------------------------------------------------------
  // Each effect is { age, dur, step(k) , end() }; k runs from 0 to 1.
  const effects = [];
  function addEffect(dur, step, end) {
    effects.push({ age: 0, dur, step, end });
  }

  const puffGeo = new THREE.SphereGeometry(1, 10, 8);
  const puffMat = toon(0xffffff);
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

  function project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  }

  /** A comic word ("BOOM!", "POOF") that pops up at a place in the world. */
  function comicText(text, x, y, z, color, small) {
    const el = document.createElement('div');
    el.className = small ? 'comic small' : 'comic';
    el.textContent = text;
    const at = project(x, y, z);
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    el.style.setProperty('--c', color);
    // Small blasts get a smaller word, so it does not hide where they hit.
    el.style.setProperty('--k', String(Math.min(1, 0.4 + blastR * 0.2)));
    el.style.setProperty('--tilt', `${Math.round(Math.random() * 24 - 12)}deg`);
    el.addEventListener('animationend', () => el.remove());
    labelLayer.appendChild(el);
  }

  function poof(x, z, color, word) {
    puffs(x, 0.8, z, 6, 1.3, 0.42);
    if (word) comicText(word, x, 2.4, z, color, true);
  }

  function vanish(id, color) {
    const c = chars.get(id);
    if (!c || !c.group.visible) return;
    poof(c.group.position.x, c.group.position.z, color, 'POOF!');
    c.group.visible = false;
  }

  function appear(id, x, z) {
    const c = chars.get(id);
    if (!c) return;
    const wasHidden = !c.group.visible;
    place(id, x, z);
    c.group.visible = true;
    if (wasHidden) poof(x, z);
  }

  function teleport(id, x, z, color) {
    const c = chars.get(id);
    if (!c) return;
    poof(c.group.position.x, c.group.position.z);
    place(id, x, z);
    poof(x, z, color, 'ZAP!');
  }

  function shake(seconds, power) {
    shakeLeft = Math.max(shakeLeft, seconds);
    shakePower = Math.max(shakePower, power);
  }

  // A jagged star, the classic comic explosion shape.
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
    const disc = new THREE.Mesh(geo.disc, discMat);
    const rim = new THREE.Mesh(geo.ring, ringMat);
    disc.rotation.x = rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    group.add(disc, rim);
    group.position.y = 0.06;
    return { group, disc, rim, discMat, ringMat };
  }

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
      [starGeometry(13, blastR * 0.98, blastR * 0.6), INK, 0],
      [starGeometry(13, blastR * 0.86, blastR * 0.52), color, 1],
      [starGeometry(11, blastR * 0.56, blastR * 0.32), 0xffe03a, 2],
      [starGeometry(9, blastR * 0.3, blastR * 0.16), 0xffffff, 3],
    ].map(([geo, c, order]) => {
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
          mesh.rotation.z += (i % 2 === 0 ? 0.004 : -0.006);
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

    puffs(x, 0.9, z, 10, blastR * 1.15, 0.95);
    comicText('BOOM!', x, 3.6, z, color, false);
    shake(0.5, 0.55);
  }

  function backOut(k) {
    const s = 2.2;
    const t = k - 1;
    return t * t * ((s + 1) * t + s) + 1;
  }

  const bombGeo = new THREE.SphereGeometry(0.55, 20, 14);
  const bandGeo = new THREE.TorusGeometry(0.55, 0.09, 8, 28);
  const capGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.26, 10);
  const sparkGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const bombMat = toon(0x34304a);

  /** A bomb falls from the sky onto (x, z) and explodes in the given colour. */
  function dropBomb(x, z, color, fallMs) {
    const bomb = new THREE.Group();
    bomb.add(outlined(new THREE.Mesh(bombGeo, bombMat), 0.08));
    const bandMat = toon(color);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = Math.PI / 2;
    const cap = outlined(new THREE.Mesh(capGeo, bombMat), 0.05);
    cap.position.y = 0.6;
    const spark = new THREE.Mesh(sparkGeo, flat(0xffe03a));
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
        spark.material.dispose();
        zone.discMat.dispose();
        zone.ringMat.dispose();
        explode(x, z, color);
      },
    );
  }

  // ---- Aim circle (only for the local player) -------------------------
  const aim = makeZone(0xffffff, 0.2);
  const aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), aim.ringMat);
  aimDot.rotation.x = -Math.PI / 2;
  aimDot.position.y = 0.01;
  aim.group.add(aimDot);
  // Snipe: a cross through the circle, like a scope. Built for radius 1 and
  // scaled with the blast size.
  const aimCross = new THREE.Group();
  for (const turn of [0, Math.PI / 2]) {
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.07), aim.ringMat);
      bar.rotation.x = -Math.PI / 2;
      bar.rotation.z = turn;
      bar.position.set(turn ? 0 : side * 1.05, 0.01, turn ? side * 1.05 : 0);
      aimCross.add(bar);
    }
  }
  aimCross.visible = false;
  aim.group.add(aimCross);
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

  /** Where on the ground (y = 0) does this mouse position point? */
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  /** Sets the explosion radius for everything drawn from now on. */
  function setBlast(r) {
    blastR = r;
    const geo = zoneGeometry(r);
    aim.disc.geometry = geo.disc;
    aim.rim.geometry = geo.ring;
    aimCross.scale.setScalar(r);
  }

  /** Switches the whole look: 'classic' or 'snipe'. */
  function setTheme(name) {
    const snipe = name === 'snipe';
    const t = snipe ? THEMES.snipe : THEMES.classic;
    sky.color.set(t.skyTop);
    sky.groundColor.set(t.skyBottom);
    sky.intensity = t.skyPower;
    sun.color.set(t.sun);
    sun.intensity = t.sunPower;
    topMat.color.set(t.top);
    dirtMat.color.set(t.dirt);
    rockMat.color.set(t.rock);
    space.userData.layers.forEach((layer, i) => {
      layer.material.color.set(t.stars[i]);
      layer.geometry.setDrawRange(0, Math.round(layer.userData.count * t.starShare));
    });
    planetA.visible = planetB.visible = !snipe;
    moon.visible = snipe;
    reticle.visible = snipe;
    patches.visible = !snipe;
    aimCross.visible = snipe;
  }

  function setRadius(radius, animate) {
    islandTarget = radius / ISLAND_R;
    if (!animate) islandScale = islandTarget;
    else shake(0.7, 0.25);
  }

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Move the camera back until the whole island fits, wide or tall window.
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const distance = Math.max((ISLAND_R + 1.6) / (t * camera.aspect), 11 / t);
    camBase.copy(CAM_TARGET).addScaledVector(CAM_DIR, distance);
    camera.position.copy(camBase);
    camera.lookAt(CAM_TARGET);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(); // so aiming works even before the first frame
  }

  /** Advances all animations by dt seconds and draws one frame. */
  function update(dt) {
    time += dt;

    islandScale += (islandTarget - islandScale) * Math.min(1, dt * 4);
    island.scale.set(islandScale, 0.55 + islandScale * 0.45, islandScale);

    space.rotateOnWorldAxis(CAM_DIR, dt * 0.004);
    planetA.rotation.y += dt * 0.05;
    for (const d of drifters) {
      d.position.y = d.userData.baseY + Math.sin(time * 0.7 + d.userData.phase) * 0.5;
      d.rotation.x += dt * d.userData.spin;
      d.rotation.y += dt * d.userData.spin * 0.7;
    }

    for (const c of chars.values()) {
      if (c.mode === 'ko') {
        c.vel.y -= 32 * dt;
        c.group.position.addScaledVector(c.vel, dt);
        c.rig.rotation.x += dt * 9;
        c.rig.rotation.z += dt * 6;
        if (c.group.position.y < -45) c.group.visible = false;
      } else {
        let turn = c.faceTarget - c.face;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        c.face += turn * Math.min(1, dt * 14);
        c.rig.rotation.y = c.face;
        let hop = 0;
        let squash = 1 + Math.sin(time * 3 + c.phase) * 0.03;
        if (c.mode === 'cheer') {
          hop = Math.abs(Math.sin(time * 8 + c.phase)) * 0.8;
        } else if (c.moving) {
          c.walk += dt * 14;
          hop = Math.abs(Math.sin(c.walk)) * 0.18;
          squash = 1 + Math.sin(c.walk * 2) * 0.07;
        }
        c.rig.position.y = hop;
        c.rig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        c.shadow.scale.setScalar(1 - hop * 0.5);
      }
      const shown = c.group.visible && c.mode !== 'ko';
      c.tag.style.display = shown ? '' : 'none';
      if (shown) {
        const at = project(c.group.position.x, 2.7, c.group.position.z);
        c.tag.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -100%)`;
      }
    }

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
      const pulse = aimPlaced ? 0.45 + Math.sin(time * 9) * 0.12 : 0.2;
      aim.discMat.opacity = pulse;
    }

    camera.position.copy(camBase);
    if (shakeLeft > 0) {
      shakeLeft -= dt;
      const p = shakePower * Math.min(1, shakeLeft * 3);
      camera.position.x += (Math.random() - 0.5) * p;
      camera.position.y += (Math.random() - 0.5) * p;
      if (shakeLeft <= 0) shakePower = 0;
    }

    renderer.render(scene, camera);
  }

  resize();
  return {
    resize, update, setPlayers, resetPose, place, setVisible, setMoving,
    knockout, cheer, vanish, appear, teleport, dropBomb, setAim, groundAt,
    setRadius, setBlast, setTheme,
  };
}
