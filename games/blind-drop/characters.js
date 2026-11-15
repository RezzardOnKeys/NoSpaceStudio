// Blind Drop – the player characters: little capsules with eyes and feet,
// a name tag above them, and their animations (walk, cheer, blown away).

import * as THREE from './vendor/three.module.js';
import { INK, toon, flat, outlined, onGround } from './look.js';

const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.5, 6, 18);
const eyeGeo = new THREE.SphereGeometry(0.14, 12, 10);
const pupilGeo = new THREE.SphereGeometry(0.075, 10, 8);
const footGeo = new THREE.SphereGeometry(0.17, 10, 8);
const shadowGeo = new THREE.CircleGeometry(0.55, 24);
const shadowMat = flat(0x000000, { transparent: true, opacity: 0.28, depthWrite: false });
const whiteMat = flat(0xffffff);
const pupilMat = flat(INK);

/**
 * `labelLayer` is the HTML layer for name tags; `project(x, y, z)` turns a
 * place in the world into a position on screen.
 */
export function createCharacters(scene, labelLayer, project) {
  const chars = new Map(); // player id -> character

  function makeCharacter() {
    const group = new THREE.Group();
    const rig = new THREE.Group(); // everything that turns and hops
    group.add(rig);
    const mat = toon(0xffffff);
    const body = outlined(new THREE.Mesh(bodyGeo, mat), 0.075);
    body.position.y = 0.72;
    rig.add(body);
    for (const side of [-1, 1]) {
      const eye = outlined(new THREE.Mesh(eyeGeo, whiteMat), 0.03);
      eye.position.set(side * 0.17, 0.95, 0.34);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.17, 0.95, 0.45);
      const foot = outlined(new THREE.Mesh(footGeo, mat), 0.05);
      foot.position.set(side * 0.2, 0.12, 0.1);
      foot.scale.set(1, 0.7, 1.3);
      rig.add(eye, pupil, foot);
    }
    const shadow = onGround(shadowGeo, shadowMat);
    shadow.position.y = 0.04;
    group.add(shadow);
    group.scale.setScalar(1.3);
    scene.add(group);

    const tag = document.createElement('div');
    tag.className = 'tag';
    labelLayer.appendChild(tag);

    return {
      group, rig, mat, shadow, tag,
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
        c = makeCharacter();
        chars.set(p.id, c);
      }
      c.mat.color.set(p.color);
      c.tag.textContent = p.label;
      c.tag.style.setProperty('--c', p.color);
    }
  }

  /** Back on its feet, e.g. after it was blown away in the last match. */
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

  /** Where a character stands and whether it is shown; null if unknown. */
  function stateOf(id) {
    const c = chars.get(id);
    return c ? { x: c.group.position.x, z: c.group.position.z, visible: c.group.visible } : null;
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

  /** Advances the animations by dt seconds and moves the name tags. */
  function update(dt, time) {
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
  }

  return {
    setPlayers, resetPose, place, setVisible, stateOf, setMoving, knockout, cheer, update,
  };
}
