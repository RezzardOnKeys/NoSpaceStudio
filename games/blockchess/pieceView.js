// Blockchess – the pieces on the board as 3D figures (pieces.js) and how
// they move: walking to the new square (the knight jumps), a captured piece
// vanishing in a puff of blocks, castling, promotion, and the captured pieces
// standing beside the board.
//
// The rules never wait for the picture. A move is handed over with play()
// and shown when it is its turn; moves that pile up (for example while the
// tab was in the background and no frames were drawn) are set at once
// without walking, so the picture always catches up with the rules.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { createPiece, animatePiece } from './pieces.js';
import { squarePos } from './board.js';

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
const facing = (color) => (color === 'w' ? Math.PI : 0);
const GRAVE_ORDER = 'qrbnp';

export function createPieceView(scene, calm) {
  const group = new THREE.Group(); // the pieces on the board
  const grave = new THREE.Group(); // the captured pieces beside it
  const puffs = new THREE.Group();
  scene.add(group, grave, puffs);

  const pieceAt = new Map(); // square -> 3D piece
  const lost = { w: [], b: [] }; // captured piece types per side
  const queue = []; // moves waiting to be shown
  let current = null; // the move being shown: { tweens, commit }
  const puffList = [];

  function place(type, color, sq) {
    const p = createPiece(type, color);
    p.position.copy(squarePos(sq));
    p.userData.square = sq;
    group.add(p);
    pieceAt.set(sq, p);
    return p;
  }

  function rebuildGrave() {
    grave.clear();
    for (const color of ['w', 'b']) {
      const list = [...lost[color]].sort((a, b) => GRAVE_ORDER.indexOf(a) - GRAVE_ORDER.indexOf(b));
      list.forEach((type, n) => {
        const p = createPiece(type, color);
        // Captured white pieces stand on the right (seen from White), black ones on the left.
        const side = color === 'w' ? 1 : -1;
        const col = Math.floor(n / 8);
        const row = n % 8;
        p.position.set(side * (6.3 + col * 0.8), -1, side * (3.5 - row));
        p.scale.setScalar(0.75);
        p.rotation.y = (-side * Math.PI) / 2;
        // Beside the board a shadow adds nothing; it only costs drawing time.
        p.traverse((o) => {
          o.castShadow = false;
        });
        grave.add(p);
      });
    }
  }

  /** A little cloud of block pieces (not shown while moves are set at once). */
  const puffGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  function puff(pos, color, n = 18) {
    const mat = new THREE.MeshLambertMaterial({ color, transparent: true });
    const parts = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(puffGeo, mat);
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5));
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2);
      puffs.add(m);
      parts.push(m);
    }
    puffList.push({ t: 0, parts, mat });
  }

  function walkTween(piece, to, jump) {
    const from = piece.position.clone();
    const target = squarePos(to);
    const dist = from.distanceTo(target);
    const face = facing(piece.userData.color);
    const dir = Math.atan2(target.x - from.x, target.z - from.z);
    const steps = Math.max(1, Math.round(dist * 1.6));
    return {
      t: 0,
      delay: 0,
      dur: CONFIG.anim.walkBase + dist * CONFIG.anim.walkPerSquare,
      fn(p) {
        piece.position.lerpVectors(from, target, ease(p));
        if (!calm) {
          piece.position.y = jump
            ? Math.sin(Math.PI * p) * (0.9 + dist * 0.15)
            : Math.abs(Math.sin(Math.PI * p * steps)) * 0.08;
        }
        const turnIn = Math.min(1, p / 0.15);
        const turnOut = Math.max(0, (p - 0.85) / 0.15);
        piece.rotation.y = turnOut > 0 ? lerpAngle(dir, face, turnOut) : lerpAngle(face, dir, turnIn);
        piece.userData.walking = Math.sin(Math.PI * Math.min(1, p * 1.2));
        if (p >= 1) {
          piece.position.copy(target);
          piece.rotation.y = face;
          piece.userData.walking = 0;
        }
      },
    };
  }

  function vanishTween(piece, animated) {
    const s0 = piece.scale.x;
    let started = false;
    return {
      t: 0,
      delay: CONFIG.anim.vanishDelay,
      dur: CONFIG.anim.vanishTime,
      fn(p) {
        if (!started && animated) puff(piece.position, piece.userData.color === 'w' ? '#e8e8e8' : '#3a3046');
        started = true;
        piece.scale.setScalar(s0 * (1 - p));
        piece.rotation.y += 0.2;
        if (p >= 1) group.remove(piece);
      },
    };
  }

  /**
   * Starts showing a move (a verbose move from rules.js). The bookkeeping of
   * which piece stands where is done at once; the walking is left to the tweens.
   */
  function start(mv, animated) {
    const piece = pieceAt.get(mv.from);
    if (!piece) return null; // out of step: reset() fixes the picture
    pieceAt.delete(mv.from);
    const tweens = [walkTween(piece, mv.to, mv.piece === 'n')];
    piece.userData.square = mv.to;

    const flags = mv.flags || '';
    const capSq = flags.includes('e') ? mv.to[0] + mv.from[1] : mv.captured ? mv.to : null;
    const victim = capSq ? pieceAt.get(capSq) : null;
    if (victim) {
      pieceAt.delete(capSq);
      tweens.push(vanishTween(victim, animated));
    }
    if (flags.includes('k') || flags.includes('q')) {
      const r = mv.from[1];
      const [rf, rt] = flags.includes('k') ? ['h' + r, 'f' + r] : ['a' + r, 'd' + r];
      const rook = pieceAt.get(rf);
      if (rook) {
        pieceAt.delete(rf);
        pieceAt.set(rt, rook);
        rook.userData.square = rt;
        tweens.push(walkTween(rook, rt, true));
      }
    }
    pieceAt.set(mv.to, piece);

    return {
      tweens,
      commit() {
        if (mv.captured) lost[mv.color === 'w' ? 'b' : 'w'].push(mv.captured);
        if (mv.promotion) {
          if (animated) puff(piece.position, '#ffe066', 30);
          group.remove(piece);
          place(mv.promotion, mv.color, mv.to);
        }
        rebuildGrave();
      },
    };
  }

  function finish(job) {
    for (const tw of job.tweens) tw.fn(1);
    job.commit();
  }

  return {
    group,

    /** Puts every piece where the rules have it, without walking (new game, reload, undo). */
    reset(rules) {
      queue.length = 0;
      current = null;
      group.clear();
      pieceAt.clear();
      for (const row of rules.board()) for (const c of row) if (c) place(c.type, c.color, c.square);
      lost.w = [];
      lost.b = [];
      for (const m of rules.history()) if (m.captured) lost[m.color === 'w' ? 'b' : 'w'].push(m.captured);
      rebuildGrave();
    },

    /** Shows a move when it is its turn. */
    play(mv) {
      queue.push(mv);
    },

    /** True while moves are still being shown. */
    busy: () => queue.length > 0,

    pieceOn: (sq) => pieceAt.get(sq),

    update(dt, t) {
      // Moves that piled up are set at once, only the newest one walks.
      while (queue.length > 1) {
        if (current) finish(current);
        else {
          const job = start(queue[0], false);
          if (job) finish(job);
        }
        current = null;
        queue.shift();
      }
      if (!current && queue.length) {
        current = start(queue[0], true);
        if (!current) queue.shift();
      }
      if (current) {
        let done = true;
        for (const tw of current.tweens) {
          tw.t += dt;
          if (tw.t < tw.delay) {
            done = false;
            continue;
          }
          const p = Math.min(1, (tw.t - tw.delay) / tw.dur);
          tw.fn(p);
          if (p < 1) done = false;
        }
        if (done) {
          current.commit();
          current = null;
          queue.shift();
        }
      }

      for (let i = puffList.length - 1; i >= 0; i--) {
        const pf = puffList[i];
        pf.t += dt;
        const p = Math.min(1, pf.t / CONFIG.anim.puffTime);
        for (const m of pf.parts) {
          m.position.addScaledVector(m.userData.v, dt);
          m.userData.v.y -= 3 * dt;
          m.scale.setScalar(1 - p);
        }
        pf.mat.opacity = 1 - p;
        if (p >= 1) {
          for (const m of pf.parts) puffs.remove(m);
          pf.mat.dispose();
          puffList.splice(i, 1);
        }
      }

      if (!calm) {
        for (const p of group.children) animatePiece(p, t);
        for (const p of grave.children) animatePiece(p, t);
      }
    },
  };
}
