// Dust Dash – builds the visible hall in the comic look: wooden floor and
// walls, windows, roof beams and every obstacle from hall.js (shelves,
// workbenches, crates, barrels, posts). Only for looks; where things are
// and what blocks the way is decided by hall.js.

import * as THREE from './vendor/three.module.js';
import { toon, flat, outlined, seeded } from './look.js';

const WOOD = {
  dark: 0x6a3f1f,
  beam: 0x7a4a26,
  shelf: 0x9a6233,
  bench: 0xb97a3f,
  crate: 0xd09a55,
  crateRim: 0xa8723a,
  barrel: 0xa8662f,
  hoop: 0x4a3a30,
  card: [0xc99a5b, 0xb9854a, 0xd8b074, 0xe2c08a],
  tins: [0xe8554e, 0x3f8fe0, 0x7fbf3f, 0xf2c230, 0x2fb5a5],
};

/**
 * A wooden boards texture drawn on a canvas: `rows` boards across, in the
 * given colours, with dark gaps, end joints and a little grain.
 */
function boards(colors, rows, seed) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = seeded(seed);
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    // every row is cut into two or three boards of different colours
    const cuts = [0, 0.25 + rnd() * 0.2, 0.6 + rnd() * 0.25, 1];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      g.fillRect(cuts[i] * size, y, (cuts[i + 1] - cuts[i]) * size, rowH);
      g.fillStyle = 'rgba(70,38,14,.55)';
      g.fillRect(cuts[i] * size, y, 2, rowH); // end joint
    }
    g.strokeStyle = 'rgba(90,50,20,.13)';
    g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const gy = y + 4 + rnd() * (rowH - 8);
      g.beginPath();
      g.moveTo(0, gy);
      g.bezierCurveTo(size * 0.3, gy + rnd() * 5 - 2.5, size * 0.7, gy + rnd() * 5 - 2.5, size, gy);
      g.stroke();
    }
    g.fillStyle = 'rgba(70,38,14,.6)';
    g.fillRect(0, y, size, 2); // gap to the next board
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildHallView(hall) {
  const group = new THREE.Group();
  const { W, D, H, hw, hd } = hall;
  const rnd = seeded(31);

  /** An outlined toon box, added to `parent` with its middle at (x, y, z). */
  const box = (parent, w, h, d, color, x, y, z, ink = 0.035) => {
    const mesh = outlined(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color)), ink);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  /** An outlined toon cylinder standing on (x, y, z). */
  const tube = (parent, radius, h, color, x, y, z, ink = 0.03) => {
    const mesh = outlined(
      new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 18), toon(color)),
      ink,
    );
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Floor: honey coloured boards along the long side ------------------
  const floorTex = boards(['#d9a05b', '#cf934e', '#e0aa66', '#c98a47', '#d59c58'], 16, 5);
  floorTex.repeat.set(W / 4, D / 4); // one picture covers 4 m: boards of 25 cm
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon(0xffffff, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // ---- Walls: upright boards, a dark skirting board at the bottom --------
  const wallTex = (length) => {
    const tex = boards(['#b9783f', '#ad6d37', '#c08247', '#a86833'], 8, 9);
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2; // boards stand upright
    tex.repeat.set(H / 4, length / 4);
    return tex;
  };
  const walls = [
    [0, -hd, 0, W],
    [0, hd, Math.PI, W],
    [-hw, 0, Math.PI / 2, D],
    [hw, 0, -Math.PI / 2, D],
  ];
  for (const [x, z, turn, length] of walls) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(length, H),
      toon(0xffffff, { map: wallTex(length) }),
    );
    wall.position.set(x, H / 2, z);
    wall.rotation.y = turn;
    wall.receiveShadow = true;
    group.add(wall);
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(length, 0.28, 0.08), toon(WOOD.dark));
    skirting.position.set(x, 0.14, z);
    skirting.rotation.y = turn;
    group.add(skirting);
  }

  // ---- Windows in the two long walls: bright panes in dark frames --------
  const pane = flat(0xfff3c8);
  for (const side of [-1, 1]) {
    for (const x of [-14, -7, 0, 7, 14]) {
      const win = new THREE.Group();
      win.position.set(x, 3.5, side * (hd - 0.03));
      if (side === 1) win.rotation.y = Math.PI;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6), pane);
      glass.position.z = 0.01;
      win.add(glass);
      const bar = (w, h, bx, by) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), toon(WOOD.dark));
        m.position.set(bx, by, 0.06);
        win.add(m);
      };
      bar(3.3, 0.16, 0, 1.38);
      bar(3.3, 0.22, 0, -1.38); // window sill
      bar(0.16, 2.9, -1.57, 0);
      bar(0.16, 2.9, 1.57, 0);
      bar(0.07, 2.6, 0, 0); // the cross in the pane
      bar(3, 0.07, 0, 0.3);
      group.add(win);
    }
  }

  // ---- A big barn door behind each start point (closed, only for looks) --
  for (const side of [-1, 1]) {
    const door = new THREE.Group();
    door.position.set(side * (hw - 0.06), 0, 0);
    door.rotation.y = (-side * Math.PI) / 2;
    box(door, 4.4, 4.2, 0.08, 0x8f5a2c, 0, 2.1, 0, 0.05);
    box(door, 4.6, 0.22, 0.12, WOOD.dark, 0, 4.25, 0.02);
    box(door, 4.2, 0.2, 0.1, WOOD.dark, 0, 1.1, 0.04);
    box(door, 4.2, 0.2, 0.1, WOOD.dark, 0, 3.2, 0.04);
    box(door, 0.12, 4.1, 0.1, WOOD.dark, 0, 2.1, 0.04);
    group.add(door);
  }

  // ---- Roof: dark boards and beams across the hall ------------------------
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon(0x8a5a30));
  roof.rotation.x = Math.PI / 2;
  roof.position.y = H;
  group.add(roof);
  for (let x = -hw + 5; x < hw; x += 5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, D), toon(WOOD.beam));
    beam.position.set(x, H - 0.25, 0);
    group.add(beam);
  }
  for (const z of [-6, 6]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, 0.4), toon(WOOD.dark));
    beam.position.set(0, H - 0.62, z);
    group.add(beam);
  }

  // ---- Obstacles ----------------------------------------------------------
  // Every obstacle is built lying along x and turned if it runs along z.
  const builders = {
    shelf(g, L, T, h) {
      for (const end of [-1, 1]) box(g, 0.1, h, T, WOOD.shelf, (end * (L - 0.1)) / 2, h / 2, 0);
      const levels = [0.18, 0.92, 1.66, h - 0.05];
      for (const y of levels) box(g, L - 0.12, 0.08, T, WOOD.shelf, 0, y, 0);
      // boxes and paint tins on the three lower boards
      for (const y of levels.slice(0, 3)) {
        let x = -L / 2 + 0.2;
        while (x < L / 2 - 0.6) {
          const w = 0.35 + rnd() * 0.5;
          if (x + w > L / 2 - 0.15) break;
          if (rnd() < 0.22) {
            const tin = WOOD.tins[Math.floor(rnd() * WOOD.tins.length)];
            tube(g, 0.14, 0.3, tin, x + 0.16, y + 0.04, 0);
            x += 0.32 + rnd() * 0.3;
          } else {
            const bh = 0.28 + rnd() * 0.32;
            const card = WOOD.card[Math.floor(rnd() * WOOD.card.length)];
            box(g, w, bh, T * 0.74, card, x + w / 2, y + 0.04 + bh / 2, 0, 0.025);
            x += w + 0.06 + rnd() * 0.35;
          }
        }
      }
    },
    bench(g, L, T, h) {
      box(g, L, 0.12, T, WOOD.bench, 0, h - 0.06, 0);
      for (const ex of [-1, 1])
        for (const ez of [-1, 1])
          box(g, 0.13, h - 0.12, 0.13, WOOD.shelf, ex * (L / 2 - 0.14), (h - 0.12) / 2, ez * (T / 2 - 0.14));
      box(g, L - 0.4, 0.06, T - 0.4, WOOD.shelf, 0, 0.22, 0);
      // tools on top: a vice, a plank being worked on, a paint tin
      box(g, 0.3, 0.22, 0.26, 0x6f7780, -L / 2 + 0.45, h + 0.11, T / 2 - 0.22, 0.025);
      const plank = box(g, Math.min(1.8, L * 0.5), 0.07, 0.24, 0xe6c188, 0.1, h + 0.035, -0.06, 0.025);
      plank.rotation.y = 0.18;
      tube(g, 0.13, 0.26, WOOD.tins[Math.floor(rnd() * WOOD.tins.length)], L / 2 - 0.4, h, 0.1);
    },
    crates(g, L, T, h) {
      const layers = Math.max(1, Math.round(h / 0.7));
      const each = h / layers;
      for (let i = 0; i < layers; i++) {
        const crate = new THREE.Group();
        crate.position.y = i * each;
        crate.rotation.y = i === 0 ? 0 : (rnd() - 0.5) * 0.16; // stacked a little crooked
        const shrink = i === 0 ? 0 : 0.1;
        box(crate, L - 0.08 - shrink, each - 0.04, T - 0.08 - shrink, WOOD.crate, 0, each / 2, 0);
        for (const y of [0.07, each - 0.09])
          box(crate, L - shrink, 0.1, T - shrink, WOOD.crateRim, 0, y, 0, 0.02);
        g.add(crate);
      }
    },
    barrel(g, L, T, h) {
      const r = Math.min(L, T) / 2;
      tube(g, r - 0.03, h, WOOD.barrel, 0, 0, 0, 0.035);
      for (const y of [0.2, h - 0.3]) tube(g, r, 0.08, WOOD.hoop, 0, y, 0, 0.015);
    },
    post(g, L, T, h) {
      box(g, L - 0.08, h, T - 0.08, WOOD.beam, 0, h / 2, 0);
      box(g, L + 0.1, 0.3, T + 0.1, WOOD.dark, 0, 0.15, 0);
    },
  };

  for (const p of hall.parts) {
    const g = new THREE.Group();
    const sx = p.x1 - p.x0;
    const sz = p.z1 - p.z0;
    g.position.set((p.x0 + p.x1) / 2, 0, (p.z0 + p.z1) / 2);
    const alongZ = sz > sx;
    if (alongZ) g.rotation.y = Math.PI / 2;
    builders[p.kind](g, alongZ ? sz : sx, alongZ ? sx : sz, p.h);
    group.add(g);
  }

  return group;
}
