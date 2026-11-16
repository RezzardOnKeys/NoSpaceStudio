// Dust Dash – draws the dirt and the dust film.
// The pieces: three kinds, each drawn as one THREE.InstancedMesh (thousands
// of copies of one small shape in a single go, which keeps the game fast).
// A piece that was vacuumed flies in a short curve into the nozzle and
// shrinks away with a little pop.
// The film: a grey layer of dust on the floor, kept as a small picture
// (one value per 12.5 cm). Where a nozzle passes, the film is wiped away
// and the warm wood shows. The film is only for looks.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { KINDS } from './dirt.js';
import { toon, seeded } from './look.js';

// Shape, colours, size range and height above the floor of each kind.
const LOOKS = [
  {
    geometry: () => new THREE.IcosahedronGeometry(0.075, 1).scale(1, 0.7, 1), // dust bunny
    colors: [0xa39b93, 0x8f8880, 0xb5ada4, 0x9c948a],
    size: [0.65, 1.25],
    lift: 0.045,
  },
  {
    geometry: () => new THREE.DodecahedronGeometry(0.05, 0), // dirt crumb
    colors: [0x6b4526, 0x7a5230, 0x5c3a20, 0x86603a],
    size: [0.6, 1.3],
    lift: 0.03,
  },
  {
    geometry: () => new THREE.TorusGeometry(0.06, 0.014, 4, 9, 4.6), // curly wood shaving
    colors: [0xf0d48f, 0xe6c377, 0xf6e0a6, 0xdcb566],
    size: [0.7, 1.4],
    lift: 0.05,
  },
];

// ---- The dust film -----------------------------------------------------------

export function createFilm(hall) {
  const T = CONFIG.dirt.filmTexels;
  const w = hall.W * T;
  const h = hall.D * T;
  const data = new Uint8Array(w * h);
  const texture = new THREE.DataTexture(data, w, h, THREE.RedFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;

  const film = {
    texture,
    /** Dust everywhere again, a little uneven so it looks natural. */
    reset() {
      const rnd = seeded(3);
      for (let i = 0; i < data.length; i++) data[i] = 205 + Math.floor(rnd() * 50);
      texture.needsUpdate = true;
    },
    /** Wipes the film away in a circle of radius r around (x, z), soft at the rim. */
    wipe(x, z, r) {
      // The floor's picture runs from the back wall (row 0 is z = +hd) to the front.
      const cx = (x + hall.hw) * T;
      const cy = (hall.hd - z) * T;
      const rt = r * T;
      const x0 = Math.max(0, Math.floor(cx - rt));
      const x1 = Math.min(w - 1, Math.ceil(cx + rt));
      const y0 = Math.max(0, Math.floor(cy - rt));
      const y1 = Math.min(h - 1, Math.ceil(cy + rt));
      for (let y = y0; y <= y1; y++) {
        for (let xx = x0; xx <= x1; xx++) {
          const d = Math.hypot(xx + 0.5 - cx, y + 0.5 - cy) / rt;
          if (d >= 1) continue;
          const keep = d < 0.6 ? 0 : Math.round(((d - 0.6) / 0.4) * 255);
          const i = y * w + xx;
          if (keep < data[i]) {
            data[i] = keep;
            texture.needsUpdate = true;
          }
        }
      }
    },
    /**
     * Changes the floor's material so that it shows the film: where the
     * film's picture is bright, the wood turns dull and grey.
     */
    applyTo(material) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.filmMap = { value: texture };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vFilmUv;')
          .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFilmUv = uv;');
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nuniform sampler2D filmMap;\nvarying vec2 vFilmUv;',
          )
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            float film = texture2D( filmMap, vFilmUv ).r;
            vec3 dusty = mix( diffuseColor.rgb, vec3( 0.47, 0.44, 0.40 ), 0.8 );
            diffuseColor.rgb = mix( diffuseColor.rgb * 1.08, dusty, film );`,
          );
      };
      material.customProgramCacheKey = () => 'dust-film';
    },
  };
  film.reset();
  return film;
}

// ---- The pieces ----------------------------------------------------------------

/**
 * nozzleOf(seat, out) must write the place of that player's nozzle into the
 * vector `out`: pieces fly there.
 */
export function createDirtView(dirt, nozzleOf) {
  const group = new THREE.Group();
  const meshes = LOOKS.map((look) => {
    const mesh = new THREE.InstancedMesh(look.geometry(), toon(0xffffff), dirt.count);
    mesh.frustumCulled = false; // the pieces are spread over the whole hall
    group.add(mesh);
    return mesh;
  });

  // Where every piece is drawn: which mesh slot, how big, how it is turned.
  const slot = new Uint32Array(dirt.count);
  const size = new Float32Array(dirt.count);
  const turn = new Float32Array(dirt.count * 3);
  const flying = []; // { id, seat, t, time }
  const dummy = new THREE.Object3D();
  const target = new THREE.Vector3();
  const color = new THREE.Color();

  function place(id, x, y, z, scale, spin) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(turn[id * 3] + spin, turn[id * 3 + 1] + spin * 1.7, turn[id * 3 + 2]);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    const mesh = meshes[dirt.kind[id]];
    mesh.setMatrixAt(slot[id], dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  const view = {
    group,

    /** Draws all pieces again after the dirt was laid out from a new seed. */
    rebuild() {
      flying.length = 0;
      const rnd = seeded(11);
      const used = new Array(KINDS).fill(0);
      for (let id = 0; id < dirt.count; id++) {
        const kind = dirt.kind[id];
        const look = LOOKS[kind];
        slot[id] = used[kind]++;
        size[id] = look.size[0] + rnd() * (look.size[1] - look.size[0]);
        // Shavings lie in all directions, the others only turn on the floor.
        turn[id * 3] = kind === 2 ? rnd() * 6.28 : 0;
        turn[id * 3 + 1] = rnd() * 6.28;
        turn[id * 3 + 2] = kind === 2 ? rnd() * 6.28 : 0;
        place(id, dirt.x[id], look.lift, dirt.z[id], dirt.there[id] ? size[id] : 0, 0);
        color.set(look.colors[Math.floor(rnd() * look.colors.length)]);
        meshes[kind].setColorAt(slot[id], color);
      }
      meshes.forEach((mesh, kind) => {
        mesh.count = used[kind];
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
    },

    /** Piece id was vacuumed by the player of this seat: let it fly into the nozzle. */
    suck(id, seat) {
      nozzleOf(seat, target);
      const far = Math.hypot(dirt.x[id] - target.x, dirt.z[id] - target.z) / CONFIG.vacuum.reach;
      // Close pieces are in the nozzle quicker than far ones.
      const time = CONFIG.vacuum.flyTime * (0.5 + 0.5 * Math.min(1, far));
      flying.push({ id, seat, t: 0, time });
    },

    /** A piece lies on the floor again (the guest took it too early). */
    show(id) {
      const at = flying.findIndex((f) => f.id === id);
      if (at >= 0) flying.splice(at, 1);
      place(id, dirt.x[id], LOOKS[dirt.kind[id]].lift, dirt.z[id], size[id], 0);
    },

    /** A piece disappears without flying (it was gone before this screen saw it). */
    hide(id) {
      place(id, dirt.x[id], 0, dirt.z[id], 0, 0);
    },

    update(dt) {
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.t += dt / f.time;
        if (f.t >= 1) {
          view.hide(f.id);
          flying.splice(i, 1);
          continue;
        }
        nozzleOf(f.seat, target);
        const look = LOOKS[dirt.kind[f.id]];
        const k = f.t * f.t; // slow lift-off, then faster and faster
        const x = dirt.x[f.id] + (target.x - dirt.x[f.id]) * k;
        const z = dirt.z[f.id] + (target.z - dirt.z[f.id]) * k;
        const y = look.lift + (target.y - look.lift) * k + Math.sin(f.t * Math.PI) * 0.16;
        // The pop: in the last quarter of the way the piece shrinks to nothing.
        const shrink = f.t < 0.75 ? 1 : 1 - (f.t - 0.75) / 0.25;
        place(f.id, x, y, z, size[f.id] * shrink, f.t * 9);
      }
    },
  };
  view.rebuild();
  return view;
}
