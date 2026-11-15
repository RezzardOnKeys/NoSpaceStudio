// Die Together – everything you can see: arena, obstacles, characters, shots.
// This file only draws. It knows nothing about rules or the network; game.js
// tells it what to show.

import * as THREE from './vendor/three.module.js';
import { ARENA_HALF, WALL_H, MAP, TEAMS, LIVES, PLAYER_H, sinkOf } from './config.js';

const INK = 0x1b1033; // colour of the thick comic outlines
const SKY = 0x7fd0ff;

/** Colour of each kind of obstacle. */
const KIND_COLORS = {
  crate: 0xe9a94f,
  wall: 0xc9c3ea,
  pillar: 0x8fe0d2,
  platform: 0xd9a6ff,
  ramp: 0xd9a6ff,
};

export function createView(canvas, labelLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 300);
  // Turn left/right first, then tilt up/down: the order of a first person view.
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8fd0, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-8, 14, 6);
  scene.add(sun);

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
  function outlined(mesh, thickness = 0.06) {
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

  // ---- Floor, surroundings and sky ---------------------------------------
  {
    // Checkered floor, one square per world unit, so distances are readable.
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffe9b8';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ffd98f';
    g.fillRect(0, 0, 32, 32);
    g.fillRect(32, 32, 32, 32);
    const tiles = new THREE.CanvasTexture(c);
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(ARENA_HALF, ARENA_HALF);
    tiles.magFilter = THREE.NearestFilter;
    tiles.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
      flat(0xffffff, { map: tiles }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Grass around the arena, only seen from above.
    const grass = new THREE.Mesh(new THREE.CircleGeometry(140, 48), flat(0x7fdc6a));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    scene.add(grass);

    // A few comic clouds.
    const cloudGeo = new THREE.SphereGeometry(1, 14, 10);
    const cloudMat = flat(0xffffff);
    const spots = [[-40, 26, -50, 9], [30, 30, -60, 12], [60, 24, 10, 8], [-55, 28, 30, 10], [5, 34, 65, 11], [-10, 40, -20, 7]];
    for (const [x, y, z, size] of spots) {
      for (const [dx, s] of [[0, 1], [-0.9, 0.65], [0.9, 0.7]]) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        puff.position.set(x + dx * size, y, z);
        puff.scale.set(size * s, size * s * 0.55, size * s * 0.8);
        scene.add(puff);
      }
    }
  }

  // The four outer walls. They are separate pieces because they move
  // inwards during a round; setArena() places them.
  const wallMat = toon(0xff9ec4);
  const wallGeoX = new THREE.BoxGeometry(ARENA_HALF * 2 + 2, WALL_H, 1);
  const wallGeoZ = new THREE.BoxGeometry(1, WALL_H, ARENA_HALF * 2 + 2);
  const walls = {
    north: outlined(new THREE.Mesh(wallGeoX, wallMat), 0.08),
    south: outlined(new THREE.Mesh(wallGeoX, wallMat), 0.08),
    west: outlined(new THREE.Mesh(wallGeoZ, wallMat), 0.08),
    east: outlined(new THREE.Mesh(wallGeoZ, wallMat), 0.08),
  };
  scene.add(walls.north, walls.south, walls.west, walls.east);

  /** The obstacles of MAP with their meshes, in the same order. */
  const obstacles = [];

  /**
   * Places the outer walls so that the free area reaches from -half to
   * +half, and lets the obstacles that the walls come close to sink.
   */
  function setArena(half) {
    walls.north.position.set(0, WALL_H / 2, -half - 0.5);
    walls.south.position.set(0, WALL_H / 2, half + 0.5);
    walls.west.position.set(-half - 0.5, WALL_H / 2, 0);
    walls.east.position.set(half + 0.5, WALL_H / 2, 0);
    for (const { o, mesh } of obstacles) {
      const sink = sinkOf(o, half);
      mesh.position.y = o.h / 2 - sink;
      mesh.visible = sink < o.h;
    }
  }

  // ---- Obstacles ---------------------------------------------------------
  /** A box whose top slopes down to the floor on one side. */
  function rampGeometry(o) {
    const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < 0) continue;
      const low =
        (o.dir === '+x' && p.getX(i) < 0) ||
        (o.dir === '-x' && p.getX(i) > 0) ||
        (o.dir === '+z' && p.getZ(i) < 0) ||
        (o.dir === '-z' && p.getZ(i) > 0);
      if (low) p.setY(i, -o.h / 2);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const materials = new Map();
  for (const o of MAP) {
    if (!materials.has(o.kind)) materials.set(o.kind, toon(KIND_COLORS[o.kind]));
    const geo = o.kind === 'ramp' ? rampGeometry(o) : new THREE.BoxGeometry(o.w, o.h, o.d);
    const mesh = outlined(new THREE.Mesh(geo, materials.get(o.kind)));
    mesh.position.set(o.x, o.h / 2, o.z);
    scene.add(mesh);
    obstacles.push({ o, mesh });
  }
  setArena(ARENA_HALF);

  // ---- Characters ------------------------------------------------------
  // Round, cute figures with big eyes, holding a pistol. A character's
  // origin is at its feet; it looks along -z when its yaw is 0.
  const chars = new Map(); // team index -> character
  const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.72, 6, 18);
  const eyeGeo = new THREE.SphereGeometry(0.15, 12, 10);
  const pupilGeo = new THREE.SphereGeometry(0.08, 10, 8);
  const footGeo = new THREE.SphereGeometry(0.17, 10, 8);
  const handGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const gunBodyGeo = new THREE.BoxGeometry(0.1, 0.14, 0.42);
  const gunGripGeo = new THREE.BoxGeometry(0.09, 0.2, 0.12);
  const whiteMat = flat(0xffffff);
  const blackMat = flat(INK);
  const gunMat = toon(0x4a4660);

  /** A simple pistol pointing along -z, with the hand that holds it. */
  function makeGun(handMat) {
    const gun = new THREE.Group();
    const body = outlined(new THREE.Mesh(gunBodyGeo, gunMat), 0.025);
    body.position.z = -0.2;
    const grip = outlined(new THREE.Mesh(gunGripGeo, gunMat), 0.025);
    grip.position.set(0, -0.14, -0.04);
    const hand = outlined(new THREE.Mesh(handGeo, handMat), 0.03);
    hand.position.set(0, -0.16, 0);
    gun.add(body, grip, hand);
    return gun;
  }

  function makeCharacter(team) {
    const mat = toon(TEAMS[team].hex);
    const group = new THREE.Group();
    const body = outlined(new THREE.Mesh(bodyGeo, mat), 0.07);
    body.position.y = 0.86;
    group.add(body);
    for (const side of [-1, 1]) {
      const eye = outlined(new THREE.Mesh(eyeGeo, whiteMat), 0.03);
      eye.position.set(side * 0.17, 1.18, -0.34);
      const pupil = new THREE.Mesh(pupilGeo, blackMat);
      pupil.position.set(side * 0.17, 1.18, -0.46);
      const foot = outlined(new THREE.Mesh(footGeo, mat), 0.05);
      foot.position.set(side * 0.2, 0.12, -0.08);
      foot.scale.set(1, 0.7, 1.3);
      group.add(eye, pupil, foot);
    }
    // The arm with the pistol tilts up and down with the view.
    const arm = new THREE.Group();
    arm.position.set(0.5, 1.0, -0.1);
    arm.add(makeGun(mat));
    group.add(arm);
    scene.add(group);

    // The lives as small hearts floating above the head.
    const tag = document.createElement('div');
    tag.className = 'hearts';
    labelLayer.appendChild(tag);

    return { group, arm, mat, tag, color: new THREE.Color(TEAMS[team].hex), blink: 0, lives: -1 };
  }

  /** Creates and removes characters so they match the list of team indexes. */
  function setCharacters(teams) {
    for (const [team, c] of chars) {
      if (teams.includes(team)) continue;
      scene.remove(c.group);
      c.mat.dispose();
      c.tag.remove();
      chars.delete(team);
    }
    for (const team of teams) {
      if (!chars.has(team)) chars.set(team, makeCharacter(team));
    }
  }

  /** Puts a character somewhere; `visible: false` hides it (your own body). */
  function placeCharacter(team, { x, y, z, yaw, pitch }, visible) {
    const c = chars.get(team);
    if (!c) return;
    c.group.visible = visible;
    c.group.position.set(x, y, z);
    c.group.rotation.y = yaw;
    c.arm.rotation.x = pitch;
  }

  /** How many hearts float above a character. */
  function setLives(team, lives) {
    const c = chars.get(team);
    if (!c || c.lives === lives) return;
    c.lives = lives;
    c.tag.textContent = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, LIVES - lives));
  }

  /** The character flashes white for a moment: it was hit. */
  function blink(team) {
    const c = chars.get(team);
    if (c) c.blink = 0.3;
  }

  // ---- Shots -------------------------------------------------------------
  // Each effect is { age, dur, step(k), end() }; k runs from 0 to 1.
  const effects = [];
  const tracerGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
  const flashGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const UP = new THREE.Vector3(0, 1, 0);

  /** A short muzzle flash and a thin line, so everybody sees where a shot came from. */
  function showShot(from, to, color) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const length = start.distanceTo(end);
    if (length < 0.01) return;

    const lineMat = flat(color, { transparent: true });
    const line = new THREE.Mesh(tracerGeo, lineMat);
    line.position.copy(start).lerp(end, 0.5);
    line.scale.y = length;
    line.quaternion.setFromUnitVectors(UP, end.clone().sub(start).normalize());
    scene.add(line);
    effects.push({
      age: 0,
      dur: 0.22,
      step: (k) => (lineMat.opacity = 1 - k),
      end: () => {
        scene.remove(line);
        lineMat.dispose();
      },
    });

    const flashMat = flat(0xfff3a0, { transparent: true });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(start);
    scene.add(flash);
    effects.push({
      age: 0,
      dur: 0.09,
      step: (k) => {
        flash.scale.setScalar(1 + k * 1.5);
        flashMat.opacity = 1 - k;
      },
      end: () => {
        scene.remove(flash);
        flashMat.dispose();
      },
    });
  }

  // ---- Camera ------------------------------------------------------------
  // The pistol you see in your own hand, fixed to the camera.
  const handMat = toon(0xffffff);
  const viewGun = makeGun(handMat);
  viewGun.position.set(0.21, -0.17, -0.5);
  viewGun.scale.setScalar(0.42);
  viewGun.visible = false;
  camera.add(viewGun);

  /** First person: the camera sits in the eyes of a character. */
  function lookFrom(x, y, z, yaw, pitch, team) {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
    handMat.color.set(TEAMS[team].hex);
    viewGun.visible = true;
  }

  /** The whole arena from above: behind the menu and for watching. */
  function lookFromAbove() {
    camera.position.set(0, 27, 21);
    camera.lookAt(0, 0, 1);
    viewGun.visible = false;
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // ---- Hearts above the heads ---------------------------------------------
  const raycaster = new THREE.Raycaster();
  const blockers = obstacles.map((entry) => entry.mesh);
  const head = new THREE.Vector3();
  const toHead = new THREE.Vector3();

  /** Is the way from the camera to this point free of obstacles? */
  function canSee(point) {
    toHead.copy(point).sub(camera.position);
    const distance = toHead.length();
    raycaster.set(camera.position, toHead.normalize());
    raycaster.far = distance;
    return raycaster.intersectObjects(blockers, false).every((hit) => !hit.object.visible);
  }

  /** Puts the hearts above every visible character that is not hidden behind something. */
  function placeHearts() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    for (const c of chars.values()) {
      let shown = c.group.visible;
      if (shown) {
        head.copy(c.group.position);
        head.y += PLAYER_H * 0.75;
        shown = canSee(head);
      }
      if (shown) {
        head.y = c.group.position.y + PLAYER_H + 0.45;
        head.project(camera);
        shown = head.z < 1 && Math.abs(head.x) < 1.1 && Math.abs(head.y) < 1.1;
      }
      c.tag.style.display = shown ? '' : 'none';
      if (shown) {
        const x = (head.x * 0.5 + 0.5) * width;
        const y = (-head.y * 0.5 + 0.5) * height;
        c.tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      }
    }
  }

  /** Advances the effects by dt seconds and draws one frame. */
  function render(dt) {
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
    for (const c of chars.values()) {
      if (c.blink <= 0) continue;
      c.blink -= dt;
      // Flicker between white and the team colour while the blink lasts.
      const white = c.blink > 0 && Math.floor(c.blink * 20) % 2 === 0;
      c.mat.color.set(white ? 0xffffff : c.color);
    }
    camera.updateMatrixWorld();
    placeHearts();
    renderer.render(scene, camera);
  }

  resize();
  lookFromAbove();
  return {
    resize, render, setArena, setCharacters, placeCharacter, setLives, blink, showShot,
    lookFrom, lookFromAbove,
  };
}
