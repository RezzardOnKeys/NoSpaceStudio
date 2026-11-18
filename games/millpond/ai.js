// Millpond – the computer opponent. For now it plays a random allowed move;
// the real search (minimax with alpha-beta, three strengths) and the web
// worker follow in step 5 of docs/MILLPOND.md.
//
// bestMove(moves, level) gets the game as its list of move texts, so it can
// also run in a web worker later, and returns { move } (null if there is none).

import { createRules } from './rules.js';

export function bestMove(moves) {
  const rules = createRules();
  if (!rules.reset(moves)) return { move: null };
  const list = rules.legal();
  return { move: list.length ? list[Math.floor(Math.random() * list.length)] : null };
}
