// Teleport Snipe – the player's own rifle at the bottom right of the screen,
// with a sleeve in the coat colour. It is drawn in a small scene of its own
// on top of the garden, so it never sinks into a wall. It kicks back on a
// shot, works the bolt while reloading and is hidden when zoomed in (then
// the scope fills the screen).

import * as THREE from './vendor/three.module.js';

const WOOD = 0x7a4a2a;
const METAL = 0x2c3034;
const LENS = 0x9fd3e6;
// Where the rifle rests in front of the eyes (camera space, metres).
const REST = new THREE.Vector3(0.21, -0.21, -0.66);

function part(group, geometry, color, x, y, z) {
  const m = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

/** calm: the player asked the system for less motion (no swaying). */
export function createViewModel(calm) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc9b48a, 1.7));
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
  sun.position.set(-1, 2, 1);
  scene.add(sun);
  // A fixed camera: the rifle looks the same at every zoom level.
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);

  const rifle = new THREE.Group();
  part(rifle, new THREE.BoxGeometry(0.06, 0.1, 0.42), WOOD, 0, -0.01, 0.1); // stock
  part(rifle, new THREE.BoxGeometry(0.05, 0.06, 0.3), WOOD, 0, 0.005, -0.22); // fore-end
  part(rifle, new THREE.BoxGeometry(0.06, 0.07, 0.16), METAL, 0, 0.03, -0.04); // action
  part(rifle, new THREE.CylinderGeometry(0.012, 0.014, 0.56, 8), METAL, 0, 0.035, -0.6).rotation.x =
    Math.PI / 2; // barrel
  part(rifle, new THREE.CylinderGeometry(0.026, 0.026, 0.24, 10), METAL, 0, 0.1, -0.08).rotation.x =
    Math.PI / 2; // scope
  part(rifle, new THREE.CylinderGeometry(0.022, 0.022, 0.005, 10), LENS, 0, 0.1, -0.2).rotation.x = Math.PI / 2;
  const bolt = part(rifle, new THREE.BoxGeometry(0.06, 0.015, 0.015), METAL, 0.05, 0.04, 0.0);
  const sleeve = part(rifle, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), 0xffffff, 0.04, -0.08, 0.2);
  sleeve.rotation.x = Math.PI / 2 - 0.3;
  // The tip of the barrel: tracers start here.
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.035, -0.88);
  rifle.add(muzzle);
  rifle.position.copy(REST);
  rifle.scale.setScalar(0.85);
  scene.add(rifle);

  let kick = 0; // 0..1, jumps to 1 on a shot and settles
  let sway = 0;
  const tmp = new THREE.Vector3();

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    scene,
    camera,
    setColor(hex) {
      sleeve.material.color.setHex(hex);
    },
    kick() {
      kick = 1;
    },
    /**
     * dt: seconds; speed: 0..1 how fast the player moves; reload: 0..1 how
     * much of the reload is left; zoom: 0..1.
     */
    update(dt, speed, reload, zoom) {
      kick = Math.max(0, kick - dt * 6);
      sway += dt * (2 + speed * 7);
      const bob = calm ? 0 : speed * 0.012;
      // Working the bolt in the middle of the reload: the rifle tips a little.
      const work = reload > 0 ? Math.sin(Math.min(1, (1 - reload) * 1.25) * Math.PI) : 0;
      rifle.position.set(
        REST.x + Math.sin(sway) * bob,
        REST.y - Math.abs(Math.cos(sway)) * bob - work * 0.04 - zoom * 0.25,
        REST.z + kick * kick * 0.09,
      );
      rifle.rotation.set(kick * kick * 0.18 + work * 0.15, 0, work * 0.35);
      bolt.position.z = work * 0.06;
      rifle.visible = zoom < 0.6;
    },
    /** Where the muzzle is on the screen, as normalised screen coordinates (-1..1). */
    muzzleOnScreen(out) {
      muzzle.getWorldPosition(tmp);
      tmp.project(camera);
      return out.set(tmp.x, tmp.y);
    },
  };
}
