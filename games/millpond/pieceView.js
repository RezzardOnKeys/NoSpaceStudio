// Millpond – the figures in the picture: the rows of pieces still to place
// next to the board, the figures on the board and how they move. A piece
// hops from its row onto its point, walks (ladybug) or glides (snail) to a
// neighbouring point, and flies in a high arc when its side has only three
// left. A closed mill lights its three pieces up, a glowing line runs along
// it and the water mill's wheel turns quickly for a moment. A removed
// ladybug opens its wings and flies away; a removed snail slides off the
// board into the pond with a small splash, and the koi come to look.
//
// The rules never wait for the picture (decision 51): play() only queues a
// move, and the moves are shown one after another. If more moves have piled
// up (a tab in the background draws nothing), they are set without
// animation.

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
import { pointPos } from './board.js';
import { NEIGHBOURS, PIECES } from './rules.js';
import { createFigure, setWings } from './pieces.js';

const A = CONFIG.anim;
const W = CONFIG.world;
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Where piece number i (0 = first to place) of a side waits in its row next to the board. */
function handSlot(side, i) {
  const z = side === 'l' ? A.handRow : -A.handRow;
  const x = (i - (PIECES - 1) / 2) * A.handGap * (side === 'l' ? 1 : -1);
  return new THREE.Vector3(x, W.islandY, z);
}

/** The way a figure looks when it stands still: ladybugs look towards the snails and back. */
const restHeading = (side) => (side === 'l' ? Math.PI : 0);

export function createPieceView(scene, { calm, world, koi }) {
  const group = new THREE.Group();
  scene.add(group);
  let onBoard = Array(24).fill(null); // the figure standing on each point
  let hands = { l: [], s: [] }; // the figures still waiting in each row
  let leaving = []; // removed figures on their way out
  const queue = [];
  let current = null; // the animation that runs now
  let selected = null;

  // Glowing lines along a closed mill.
  const lineMat = new THREE.MeshBasicMaterial({ color: CONFIG.marks.mill, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.14), lineMat);
    m.visible = false;
    scene.add(m);
    return m;
  });

  function newFigure(side, pos) {
    const fig = createFigure(side);
    fig.root.position.copy(pos);
    fig.root.rotation.y = restHeading(side);
    group.add(fig.root);
    return fig;
  }

  function dispose(fig) {
    group.remove(fig.root);
    fig.mat.dispose();
  }

  /** Puts a figure on point p at once; turn: also turn it to its resting direction at once. */
  function setOn(fig, p, turn = true) {
    fig.root.position.copy(pointPos(p));
    fig.root.rotation.set(0, turn ? restHeading(fig.side) : fig.root.rotation.y, 0);
    fig.root.scale.setScalar(1);
    fig.root.userData.point = p;
    setWings(fig, 0);
    onBoard[p] = fig;
  }

  /** Starts showing a move; instant = set it at once without animation. */
  function start(done, instant) {
    const { side } = done;
    if (done.k === 'p') {
      const fig = hands[side].pop() || newFigure(side, handSlot(side, 0));
      fig.root.scale.setScalar(1);
      const from = fig.root.position.clone();
      onBoard[done.to] = fig;
      fig.root.userData.point = done.to;
      if (instant) return setOn(fig, done.to);
      current = { kind: 'hop', fig, from, to: pointPos(done.to), point: done.to, t: 0, dur: A.place, height: A.placeHeight, mills: done.mills };
    } else if (done.k === 'm') {
      const fig = onBoard[done.from];
      if (!fig) return;
      onBoard[done.from] = null;
      onBoard[done.to] = fig;
      fig.root.userData.point = done.to;
      if (instant) return setOn(fig, done.to);
      const from = pointPos(done.from);
      const to = pointPos(done.to);
      const dist = from.distanceTo(to);
      const flying = !NEIGHBOURS[done.from].includes(done.to);
      const slow = side === 's' ? A.snailSlower : 1;
      current = flying
        ? { kind: 'fly', fig, from, to, point: done.to, t: 0, dur: A.flyBase + A.flyPerMetre * dist, height: A.flyHeight, mills: done.mills }
        : { kind: 'walk', fig, from, to, point: done.to, t: 0, dur: (A.walkBase + A.walkPerMetre * dist) * slow, mills: done.mills };
    } else {
      const fig = onBoard[done.at];
      if (!fig) return;
      onBoard[done.at] = null;
      fig.root.userData.point = undefined;
      if (instant) return dispose(fig);
      leaving.push(side === 'l' ? flyAway(fig) : slideAway(fig));
    }
    if (current) current.fig.root.rotation.y = headingTo(current.from, current.to, current.fig);
  }

  const headingTo = (from, to, fig) => (from.distanceTo(to) < 0.01 ? fig.root.rotation.y : Math.atan2(to.x - from.x, to.z - from.z));

  // ---- Leaving the board --------------------------------------------------------

  /** A ladybug opens its shell and flies up and away in a wide curve. */
  function flyAway(fig) {
    const start = fig.root.position.clone();
    const out = new THREE.Vector3(start.x, 0, start.z).normalize();
    if (out.lengthSq() < 0.5) out.set(0, 0, 1);
    return {
      fig,
      t: 0,
      dur: A.flyAway,
      step(t, clock) {
        const open = clamp01(t / 0.25);
        setWings(fig, open, clock * 40);
        const k = clamp01((t - 0.25) / (A.flyAway - 0.25));
        const e = k * k;
        const curl = k * 2.2;
        fig.root.position.set(
          start.x + (out.x * Math.cos(curl) - out.z * Math.sin(curl)) * e * 14,
          start.y + e * 9 + Math.sin(k * Math.PI) * 0.6,
          start.z + (out.z * Math.cos(curl) + out.x * Math.sin(curl)) * e * 14,
        );
        fig.root.rotation.set(-0.5 * open, Math.atan2(out.x, out.z) + curl, 0);
        fig.root.scale.setScalar(1 - 0.6 * k);
      },
    };
  }

  /** A snail slides off the board, over the grass and into the pond. */
  function slideAway(fig) {
    const p = fig.root.position.clone();
    const out = new THREE.Vector3(p.x, 0, p.z);
    // Away from the board along the side the snail stands on.
    if (Math.abs(out.x) > Math.abs(out.z)) out.set(Math.sign(out.x), 0, 0);
    else out.set(0, 0, Math.sign(out.z) || 1);
    const edge = CONFIG.board.spacing * 3 + 0.65;
    const along = (d) => new THREE.Vector3(out.x * d, 0, out.z * d).add(new THREE.Vector3(out.z ? p.x : 0, 0, out.x ? p.z : 0));
    const off = Math.abs(out.x ? p.x : p.z);
    const keys = [
      { at: along(off), y: 0 },
      { at: along(edge), y: 0 },
      { at: along(edge + 0.45), y: W.islandY },
      { at: along(W.islandRadius), y: W.islandY },
      { at: along(W.islandRadius + 1.1), y: W.waterY },
      { at: along(W.islandRadius + 1.6), y: W.waterY - 0.7 },
    ];
    // How far along the path each key point lies, for a steady slide.
    const dists = [0];
    for (let i = 1; i < keys.length; i++) dists.push(dists[i - 1] + keys[i].at.distanceTo(keys[i - 1].at) + Math.abs(keys[i].y - keys[i - 1].y));
    const total = dists[dists.length - 1];
    let splashed = false;
    fig.root.rotation.set(0, Math.atan2(out.x, out.z), 0);
    return {
      fig,
      t: 0,
      dur: A.slideAway,
      step(t) {
        const d = ease(clamp01(t / A.slideAway)) * total;
        let i = 1;
        while (i < keys.length - 1 && dists[i] < d) i++;
        const k = clamp01((d - dists[i - 1]) / (dists[i] - dists[i - 1] || 1));
        const a = keys[i - 1];
        const b = keys[i];
        fig.root.position.lerpVectors(a.at, b.at, k);
        fig.root.position.y = a.y + (b.y - a.y) * k;
        // Nose down while it slides down the bank.
        fig.root.rotation.x = i >= 4 ? 0.5 : 0;
        if (!splashed && i >= 5) {
          splashed = true;
          const at = fig.root.position;
          koi.splash(at.x, at.z);
          koi.attract(at.x, at.z);
        }
      },
    };
  }

  // ---- Every frame -------------------------------------------------------------------

  /** The glow of a closed mill: its pieces light up and a line runs along it. */
  function showMill(mills, k) {
    const glow = Math.sin(clamp01(k) * Math.PI);
    const lit = new Set(mills.flat());
    for (const p of lit) if (onBoard[p]) onBoard[p].mat.emissive.set(CONFIG.marks.mill).multiplyScalar(glow * 0.8);
    lines.forEach((line, i) => {
      const m = mills[i];
      line.visible = !!m && k < 1;
      if (!line.visible) return;
      const a = pointPos(m[0]);
      const b = pointPos(m[2]);
      const grow = clamp01(k * 2.5);
      const len = a.distanceTo(b) * grow + 0.14;
      line.position.lerpVectors(a, a.clone().lerp(b, grow), 0.5).setY(0.07);
      line.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      line.scale.set(len, 1, 1);
    });
    lineMat.opacity = glow * 0.9;
  }

  function stepCurrent(dt, clock) {
    const c = current;
    c.t += dt;
    if (c.phase === 'mill') {
      showMill(c.mills, c.t / A.millGlow);
      if (c.t >= A.millGlow) {
        showMill(c.mills, 1);
        current = null;
      }
      return;
    }
    const k = clamp01(c.t / c.dur);
    const e = ease(k);
    const pos = c.fig.root.position;
    pos.lerpVectors(c.from, c.to, e);
    if (c.kind === 'hop') {
      pos.y = c.from.y + (c.to.y - c.from.y) * e + Math.sin(k * Math.PI) * c.height;
    } else if (c.kind === 'fly') {
      pos.y = Math.sin(k * Math.PI) * c.height;
      setWings(c.fig, Math.sin(k * Math.PI) * 1.5, clock * 40);
    } else if (!calm && c.fig.side === 'l') {
      // A ladybug trips along in little hops; a snail just glides.
      pos.y = Math.abs(Math.sin(k * Math.PI * A.walkHops)) * 0.06;
    }
    if (calm) pos.y = c.kind === 'walk' ? 0 : pos.y;
    if (k >= 1) {
      setOn(c.fig, c.point, false);
      if (c.mills && c.mills.length) {
        world.spinWheel();
        current = { phase: 'mill', mills: c.mills, t: 0 };
      } else current = null;
    }
  }

  return {
    group,

    /** The 3D objects of the figures on the board (for clicks). */
    pickable: () => onBoard.filter(Boolean).map((f) => f.root),

    /** Queues a move to show (what rules.move() returned). */
    play(done) {
      queue.push(done);
    },

    /** Something is still moving (the buttons and the result wait for it). */
    busy: () => !!current || queue.length > 0,

    /** The chosen piece hops gently on its point. */
    setSelected(p) {
      selected = p;
    },

    /** Sets every figure at once for the game now in the rules (new, continued or rejoined). */
    reset(rules) {
      queue.length = 0;
      current = null;
      for (const f of [...onBoard, ...hands.l, ...hands.s, ...leaving.map((l) => l.fig)]) if (f) dispose(f);
      onBoard = Array(24).fill(null);
      hands = { l: [], s: [] };
      leaving = [];
      lineMat.opacity = 0;
      for (const line of lines) line.visible = false;
      for (const side of ['l', 's']) {
        for (let i = 0; i < rules.hand(side); i++) hands[side].push(newFigure(side, handSlot(side, i)));
      }
      const board = rules.board();
      for (let p = 0; p < 24; p++) if (board[p]) setOn(newFigure(board[p], pointPos(p)), p);
    },

    /** True if the picture shows exactly this board and these hands (checked while nothing moves). */
    matches(rules) {
      const board = rules.board();
      for (let p = 0; p < 24; p++) if ((onBoard[p] ? onBoard[p].side : null) !== board[p]) return false;
      return hands.l.length === rules.hand('l') && hands.s.length === rules.hand('s');
    },

    update(dt, clock) {
      // Moves that piled up are set at once, all in this frame; the last one is animated.
      while (!current && queue.length) {
        const done = queue.shift();
        start(done, queue.length > 0);
      }
      // A piece always leaves the end of its row, so the rest stay where they are.
      if (current) stepCurrent(dt, clock);
      leaving = leaving.filter((l) => {
        l.t += dt;
        l.step(l.t, clock);
        if (l.t < l.dur) return true;
        dispose(l.fig);
        return false;
      });
      // The chosen piece hops; everything else stands still on its point
      // and turns back to its resting direction after a move.
      for (const [p, fig] of onBoard.entries()) {
        if (!fig || (current && current.fig === fig)) continue;
        fig.root.position.y = p === selected && !calm ? Math.abs(Math.sin(clock * 5)) * 0.12 : 0;
        const r = fig.root.rotation;
        const d = Math.atan2(Math.sin(restHeading(fig.side) - r.y), Math.cos(restHeading(fig.side) - r.y));
        r.y += d * Math.min(1, dt * 5);
      }
    },
  };
}
