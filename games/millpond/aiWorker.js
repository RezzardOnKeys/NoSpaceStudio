// Millpond – runs the computer opponent (ai.js) away from the page, so the
// 3D picture keeps moving while it thinks. game.js sends { moves, level, id }
// and gets { move, depth, nodes, id } back; id tells an old answer from a new one.
import { bestMove } from './ai.js';

self.onmessage = (e) => {
  const { moves, level, id } = e.data;
  self.postMessage({ ...bestMove(moves, level), id });
};
