// Millpond – the computer opponent. It plays by the same rules (rules.js)
// and looks ahead with a minimax search with alpha-beta pruning: it tries
// its moves, the answers to them, its answers to those ... and picks the
// move that leaves it best off if the other side also plays well. Removing
// a piece counts as a move of its own, just like in the rules.
//
// How good a position is (the score, seen from the computer's side):
//   - pieces: every piece more than the other side (on the board or still
//     in hand) is worth a lot
//   - a mill that was just closed: the piece it will take counts already
//   - mills that are about to close: two in a row with the third point
//     free, while placing (or flying) or when an own piece can step there
//   - standing mills (they can be opened and closed again)
//   - moving: how many moves each side has (a side that cannot move loses)
//
// Easy looks one move ahead, adds a lot of chance to its scores and now and
// then just picks one of its better moves; medium looks a few moves ahead,
// hard deeper (as deep as its thinking time allows). The numbers are under
// `ai` in config.js.
//
// bestMove(moves, level) gets the game as its list of move texts (so it can
// run in a web worker, see aiWorker.js) and returns { move, depth, nodes }.

import { CONFIG } from './config.js';
import { createRules, legalMoves, applyMove, outcomeOf, positionKey, other, MILLS, NEIGHBOURS, FLY_AT } from './rules.js';

const WIN = 100000;
const W = CONFIG.ai.weights;

/** The mills each point belongs to. */
const MILLS_OF = Array.from({ length: 24 }, (_, p) => MILLS.filter((m) => m.includes(p)));

/** A copy for the search: the counted positions are shared and undone after each try. */
const light = (s) => ({
  board: s.board.slice(),
  turn: s.turn,
  hand: { l: s.hand.l, s: s.hand.s },
  onBoard: { l: s.onBoard.l, s: s.onBoard.s },
  removing: s.removing,
  quiet: s.quiet,
  seen: s.seen,
  plies: s.plies,
});

/** Mills of `side` that need only the one free point: [free point, ...] per such line. */
function threats(s, side) {
  const list = [];
  for (const m of MILLS) {
    let own = 0;
    let free = -1;
    for (const p of m) {
      if (s.board[p] === side) own++;
      else if (!s.board[p]) free = p;
    }
    if (own === 2 && free >= 0) list.push({ free, line: m });
  }
  return list;
}

/** How many steps `side` could make along the lines (not counting flying). */
function mobility(s, side) {
  let n = 0;
  for (let p = 0; p < 24; p++) {
    if (s.board[p] !== side) continue;
    for (const q of NEIGHBOURS[p]) if (!s.board[q]) n++;
  }
  return n;
}

/** The score of a position for `me` (positive: good for me). */
export function evaluate(s, me) {
  let score = 0;
  for (const side of ['l', 's']) {
    const sign = side === me ? 1 : -1;
    const left = s.hand[side] + s.onBoard[side];
    score += sign * left * W.piece;
    const placing = s.hand[side] > 0;
    const flying = !placing && s.onBoard[side] <= FLY_AT;
    for (const t of threats(s, side)) {
      // While placing or flying any two in a row can be closed; while
      // moving only if an own piece (not one of the two) stands next to the gap.
      const closable = placing || flying || NEIGHBOURS[t.free].some((q) => s.board[q] === side && !t.line.includes(q));
      score += sign * (closable ? W.threat : W.openTwo);
    }
    for (const m of MILLS) if (m.every((p) => s.board[p] === side)) score += sign * W.mill;
    if (!placing && !flying) score += sign * mobility(s, side) * W.mobility;
  }
  // A mill was just closed: the piece it takes counts already.
  if (s.removing) score += (s.turn === me ? 1 : -1) * W.piece;
  return score;
}

/** Does this placing or moving move close a mill? */
function closesMill(s, m) {
  if (m.k === 'x') return false;
  const side = s.turn;
  return MILLS_OF[m.to].some((line) => line.every((p) => p === m.to || (s.board[p] === side && p !== m.from)));
}

/** Good moves first, so the search can cut more: closing mills, then blocking the other side's mills. */
function ordered(s, moves) {
  const theirs = new Set(threats(s, other(s.turn)).map((t) => t.free));
  const rank = (m) => {
    if (m.k === 'x') return theirs.size && threats(s, other(s.turn)).some((t) => t.line.includes(m.at)) ? 2 : 1;
    if (closesMill(s, m)) return 3;
    return theirs.has(m.to) ? 2 : 0;
  };
  return moves.map((m) => ({ m, r: rank(m) })).sort((a, b) => b.r - a.r).map((x) => x.m);
}

class OutOfTime extends Error {}

/** Plays m on a copy of s for the search; returns [child, the counted key or null]. */
function tryMove(s, m) {
  const child = light(s);
  applyMove(child, m);
  return [child, child.turn !== s.turn ? positionKey(child) : null];
}

function forget(seen, key) {
  if (key === null) return;
  const n = seen.get(key) - 1;
  if (n > 0) seen.set(key, n);
  else seen.delete(key);
}

function search(s, depth, alpha, beta, me, ply, budget) {
  if (++budget.nodes % 1024 === 0 && performance.now() > budget.until) throw new OutOfTime();
  const out = outcomeOf(s);
  if (out) return out.w === null ? 0 : out.w === me ? WIN - ply : -WIN + ply;
  if (depth === 0) return evaluate(s, me);
  const maximize = s.turn === me;
  let best = maximize ? -Infinity : Infinity;
  for (const m of ordered(s, legalMoves(s))) {
    const [child, key] = tryMove(s, m);
    let v;
    try {
      v = search(child, depth - 1, alpha, beta, me, ply + 1, budget);
    } finally {
      forget(s.seen, key);
    }
    if (maximize) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

/** The scores of all moves at one depth (with a window just wide enough for the chance added later). */
function scoreRoot(s, moves, depth, me, noise, budget) {
  let best = -Infinity;
  const scored = [];
  for (const m of moves) {
    const [child, key] = tryMove(s, m);
    let v;
    try {
      v = search(child, depth - 1, best - noise * 3, Infinity, me, 1, budget);
    } finally {
      forget(s.seen, key);
    }
    if (v > best) best = v;
    scored.push({ m, v });
  }
  return scored;
}

export function bestMove(moves, level, rnd = Math.random) {
  const rules = createRules();
  if (!rules.reset(moves)) return { move: null, depth: 0, nodes: 0 };
  const s = rules.state;
  const me = s.turn;
  const list = ordered(s, legalMoves(s));
  if (!list.length) return { move: null, depth: 0, nodes: 0 };
  const L = CONFIG.ai.levels[level] || CONFIG.ai.levels[2];
  const budget = { nodes: 0, until: performance.now() + L.timeMs };

  // Look deeper step by step; if the time runs out, keep the last finished depth.
  let scored = list.map((m) => ({ m, v: 0 }));
  let depth = 0;
  for (let d = 1; d <= L.depth; d++) {
    try {
      scored = scoreRoot(s, list, d, me, L.noise, budget);
      depth = d;
    } catch (e) {
      if (!(e instanceof OutOfTime)) throw e;
      break;
    }
    // A certain win, or a loss whatever it does, does not change by looking further.
    if (scored.some((x) => x.v > WIN / 2) || scored.every((x) => x.v < -WIN / 2)) break;
  }

  // A little chance on top, so the computer does not always play the same.
  for (const x of scored) x.v += (rnd() - 0.5) * 2 * L.noise;
  scored.sort((a, b) => b.v - a.v);
  let pick = scored[0];
  if (L.slip && rnd() < L.slip) {
    // Now and then a weaker move: one of the better half, but not one that loses at once.
    const fine = scored.filter((x) => x.v > -WIN / 2);
    const half = fine.slice(0, Math.max(1, Math.ceil(fine.length / 2)));
    pick = half[Math.floor(rnd() * half.length)] || pick;
  }
  return { move: pick.m, depth, nodes: budget.nodes };
}
