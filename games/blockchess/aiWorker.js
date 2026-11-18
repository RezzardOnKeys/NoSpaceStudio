// Blockchess – runs the computer opponent (ai.js) away from the page, so the
// 3D picture keeps moving while it thinks. game.js sends { fen, level, id }
// and gets { move, nodes, id } back; id tells an old answer from a new one.
import { bestMove } from './ai.js';

self.onmessage = (e) => {
  const { fen, level, id } = e.data;
  self.postMessage({ ...bestMove(fen, level), id });
};
