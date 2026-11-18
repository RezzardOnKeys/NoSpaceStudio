// Blockchess – the rules of chess, wrapped around chess.js (vendor/). It knows
// the position and every move so far, checks if a move is allowed and tells
// when and how a game is over. It has no picture and no network, so the
// referee (host.js), the guest's copy (guest.js) and the test scripts all use
// the very same rules.
//
// A move travels as a short text: from-square, to-square and, for a pawn
// that reaches the last rank, the new piece: "e2e4", "e7e8q".

import { Chess } from './vendor/chess.js';

const SQUARE = /^[a-h][1-8]$/;
const PROMOTION = /^[qrbn]$/;

/** "e7e8q" -> { from: 'e7', to: 'e8', promotion: 'q' }, or null if it is no move text. */
export function unpackMove(text) {
  if (typeof text !== 'string' || text.length < 4 || text.length > 5) return null;
  const from = text.slice(0, 2);
  const to = text.slice(2, 4);
  const promotion = text[4];
  if (!SQUARE.test(from) || !SQUARE.test(to)) return null;
  if (promotion !== undefined && !PROMOTION.test(promotion)) return null;
  return { from, to, promotion };
}

/** { from, to, promotion } -> "e7e8q". */
export const packMove = (m) => m.from + m.to + (m.promotion || '');

/**
 * How a game ended, or null while it goes on.
 * w: the winning side ('w' or 'b'), null for a draw.
 * why: checkmate | resign | stalemate | repetition | material | fifty
 */
export function validResult(r) {
  if (!r || typeof r !== 'object') return null;
  const why = ['checkmate', 'resign', 'stalemate', 'repetition', 'material', 'fifty'];
  if (!why.includes(r.why)) return null;
  const w = r.w === 'w' || r.w === 'b' ? r.w : null;
  if ((r.why === 'checkmate' || r.why === 'resign') && !w) return null;
  return { w, why: r.why };
}

export function createRules() {
  const chess = new Chess();

  const rules = {
    /** Back to the start position and then play these move texts (all must be legal). */
    reset(moves = []) {
      chess.reset();
      for (const text of moves) {
        if (!rules.move(unpackMove(text))) {
          chess.reset();
          return false;
        }
      }
      return true;
    },

    /**
     * Plays { from, to, promotion } if it is allowed. Returns the move with
     * everything the picture needs (piece, captured, flags, san), else null.
     * A pawn reaching the last rank without a choice becomes a queen.
     */
    move(m) {
      if (!m || !SQUARE.test(m.from) || !SQUARE.test(m.to)) return null;
      const options = chess.moves({ square: m.from, verbose: true }).filter((o) => o.to === m.to);
      if (!options.length) return null;
      const wanted = !options[0].promotion
        ? options[0]
        : options.find((o) => o.promotion === m.promotion) || options.find((o) => o.promotion === 'q');
      if (!wanted) return null;
      return chess.move({ from: wanted.from, to: wanted.to, promotion: wanted.promotion });
    },

    /** Takes the last move back (only used alone against the computer). */
    undo: () => chess.undo(),

    /** The moves a piece on this square may make now. */
    movesFrom: (square) => chess.moves({ square, verbose: true }),

    get turn() {
      return chess.turn();
    },
    get plies() {
      return chess.history().length;
    },
    inCheck: () => chess.inCheck(),
    get: (square) => chess.get(square),
    board: () => chess.board(),
    fen: () => chess.fen(),
    /** Every move so far with all details, oldest first. */
    history: () => chess.history({ verbose: true }),
    /** Every move so far in short algebraic notation ("Nf3"), for the move list. */
    notation: () => chess.history(),
    /** Every move so far as move texts, to send or to store. */
    packed: () => chess.history({ verbose: true }).map(packMove),
    /** The king of the side to move, if it is in check (for the red mark). */
    checkedKing() {
      if (!chess.inCheck()) return null;
      for (const row of chess.board()) {
        for (const c of row) if (c && c.type === 'k' && c.color === chess.turn()) return c.square;
      }
      return null;
    },

    /** How the position ended the game, or null if it goes on. */
    outcome() {
      if (chess.isCheckmate()) return { w: chess.turn() === 'w' ? 'b' : 'w', why: 'checkmate' };
      if (chess.isStalemate()) return { w: null, why: 'stalemate' };
      if (chess.isInsufficientMaterial()) return { w: null, why: 'material' };
      if (chess.isThreefoldRepetition()) return { w: null, why: 'repetition' };
      if (chess.isDrawByFiftyMoves()) return { w: null, why: 'fifty' };
      return null;
    },
  };
  return rules;
}
