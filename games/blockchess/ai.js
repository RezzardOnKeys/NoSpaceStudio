// Blockchess – the computer opponent: a negamax search with alpha-beta
// pruning that looks further along capture sequences ("quiescence"). It runs
// in a web worker (aiWorker.js), so the picture never stutters while it thinks.
import { Chess } from './vendor/chess.js';
import { CONFIG } from './config.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Bonus tables per square, seen from White; row 0 = rank 8
const PST = {
  p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  r: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  k: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]],
};
const MATE = 100000;

// For speed this uses the internal 0x88 functions of chess.js 1.4
// (_moves / _makeMove / _undoMove / _board). The public API writes out the
// notation of every move and is about 10 times too slow for a search. That is
// why exactly this version of chess.js is shipped in vendor/.
function evaluate(g) {
  let s = 0;
  const b = g._board;
  for (let i = 0; i < 128; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = b[i];
    if (!p) continue;
    {
      const r = i >> 4, c = i & 7;
      const v = VAL[p.type] + (p.color === 'w' ? PST[p.type][r][c] : PST[p.type][7 - r][c]);
      s += p.color === 'w' ? v : -v;
    }
  }
  return g.turn() === 'w' ? s : -s;
}

const order = (m) => (m.captured ? 10 * VAL[m.captured] - VAL[m.piece] + 1000 : 0) + (m.promotion ? 800 : 0);

let nodes = 0;
function quiesce(g, alpha, beta, qd) {
  nodes++;
  const stand = evaluate(g);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (qd === 0) return alpha;
  const caps = g._moves({ legal: true }).filter((m) => m.captured).sort((a, b) => order(b) - order(a));
  for (const m of caps) {
    g._makeMove(m);
    const v = -quiesce(g, -beta, -alpha, qd - 1);
    g._undoMove();
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(g, depth, alpha, beta, ply) {
  nodes++;
  const moves = g._moves({ legal: true });
  if (moves.length === 0) return g.inCheck() ? -MATE + ply : 0;
  if (depth === 0) return quiesce(g, alpha, beta, 3);
  moves.sort((a, b) => order(b) - order(a));
  for (const m of moves) {
    g._makeMove(m);
    const v = -negamax(g, depth - 1, -beta, -alpha, ply + 1);
    g._undoMove();
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

/**
 * The move the computer plays in the position `fen` at strength `level`
 * (1 easy, 2 medium, 3 hard). `noise` adds a little chance, more on easy.
 */
export function bestMove(fen, level) {
  const g = new Chess(fen);
  const { depth, noise } = CONFIG.ai.levels[level] || CONFIG.ai.levels[2];
  nodes = 0;
  const moves = g.moves({ verbose: true }).sort((a, b) => order(b) - order(a));
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    g.move(m);
    // Avoid a draw by repetition while being ahead
    let v = -negamax(g, depth - 1, -MATE - 1, MATE + 1, 1);
    if (g.isThreefoldRepetition()) v = Math.min(v, 0);
    g.undo();
    v += (Math.random() - 0.5) * noise;
    if (v > bestScore) { bestScore = v; best = m; }
  }
  return { move: best && { from: best.from, to: best.to, promotion: best.promotion }, nodes };
}
