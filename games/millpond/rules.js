// Millpond – the rules: the board with its 24 points, placing, moving,
// flying, mills, removing a piece, and how and when a game ends. It has no
// picture and no network, so the referee (host.js), the guest's copy
// (guest.js), the computer (ai.js) and the test scripts all use the very
// same rules.
//
// The two sides: 'l' = the Ladybugs (they always begin), 's' = the Snails.
//
// The points of the board are numbered 0 to 23: three squares inside each
// other (ring 0 outside, ring 2 inside), on each ring eight points going
// clockwise from the top left corner. Even numbers on a ring are corners,
// odd numbers are the middles of the sides, where the rings are joined.
//
//    0 ----------- 1 ----------- 2
//    |             |             |
//    |    8 ------ 9 ------ 10   |
//    |    |        |        |    |
//    |    |   16 - 17 - 18  |    |
//    |    |   |          |  |    |
//    7 -- 15 - 23       19 - 11 - 3
//    |    |   |          |  |    |
//    |    |   22 - 21 - 20  |    |
//    |    |        |        |    |
//    |    14 ----- 13 ----- 12   |
//    |             |             |
//    6 ----------- 5 ----------- 4
//
// A move is one of three things, and travels as a short text:
//   { k: 'p', to }        place a new piece on point `to`        "p5"
//   { k: 'm', from, to }  move (or fly) a piece from one point   "m5-6"
//   { k: 'x', at }        remove the opponent's piece at `at`    "x12"
// A whole game is the list of its move texts, so it can be sent, stored and
// replayed. Removing is a move of its own: whoever closes a mill plays a
// second move right after it, the removal, and only then the turn passes.

export const SIDES = ['l', 's'];
export const other = (side) => (side === 'l' ? 's' : 'l');
export const PIECES = 9;
/** With this many pieces left a side may fly. */
export const FLY_AT = 3;
/** Fewer pieces than this and a side has lost. */
const LOSE_BELOW = 3;
/** Moves in a row (both sides together) without a mill in the moving phase until a draw. */
export const QUIET_LIMIT = 50;
/** How often the same position may come up before it is a draw. */
const REPEAT_LIMIT = 3;

/** Where each point is on a 7 x 7 grid (x to the right, y down), for the picture. */
export const POINT_GRID = (() => {
  const ring = [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 1],
  ];
  const grid = [];
  for (let r = 0; r < 3; r++) {
    const size = 3 - r; // half the width of the square
    for (const [cx, cy] of ring) grid.push([3 + (cx - 1) * size, 3 + (cy - 1) * size]);
  }
  return grid;
})();

/** The neighbours of every point along the lines of the board. */
export const NEIGHBOURS = (() => {
  const n = Array.from({ length: 24 }, () => []);
  const join = (a, b) => {
    n[a].push(b);
    n[b].push(a);
  };
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 8; k++) join(r * 8 + k, r * 8 + ((k + 1) % 8));
  }
  for (let r = 0; r < 2; r++) {
    for (let k = 1; k < 8; k += 2) join(r * 8 + k, (r + 1) * 8 + k);
  }
  return n;
})();

/** All 16 lines of three points that make a mill. */
export const MILLS = (() => {
  const mills = [];
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 8; k += 2) mills.push([r * 8 + k, r * 8 + k + 1, r * 8 + ((k + 2) % 8)]);
  }
  for (let k = 1; k < 8; k += 2) mills.push([k, 8 + k, 16 + k]);
  return mills;
})();

/** The mills every point belongs to (always two). */
const MILLS_OF = Array.from({ length: 24 }, (_, p) => MILLS.filter((m) => m.includes(p)));

const isPoint = (p) => Number.isInteger(p) && p >= 0 && p < 24;

/** "m5-6" -> { k: 'm', from: 5, to: 6 }, or null if it is no move text. */
export function unpackMove(text) {
  if (typeof text !== 'string') return null;
  let m = /^p(\d{1,2})$/.exec(text);
  if (m) return isPoint(+m[1]) ? { k: 'p', to: +m[1] } : null;
  m = /^m(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return isPoint(+m[1]) && isPoint(+m[2]) ? { k: 'm', from: +m[1], to: +m[2] } : null;
  m = /^x(\d{1,2})$/.exec(text);
  if (m) return isPoint(+m[1]) ? { k: 'x', at: +m[1] } : null;
  return null;
}

/** { k: 'm', from: 5, to: 6 } -> "m5-6". */
export function packMove(m) {
  if (m.k === 'p') return 'p' + m.to;
  if (m.k === 'm') return 'm' + m.from + '-' + m.to;
  return 'x' + m.at;
}

/** Why a game can end. */
export const ENDINGS = ['pieces', 'blocked', 'resign', 'repetition', 'quiet'];

/**
 * How a game ended, checked (for messages and storage), or null.
 * w: the winning side ('l' or 's'), null for a draw.
 * why: pieces (the loser has only 2 left) | blocked (the loser cannot move)
 *      | resign | repetition | quiet (50 moves without a mill)
 */
export function validResult(r) {
  if (!r || typeof r !== 'object' || !ENDINGS.includes(r.why)) return null;
  const w = SIDES.includes(r.w) ? r.w : null;
  const draw = r.why === 'repetition' || r.why === 'quiet';
  if (draw !== (w === null)) return null;
  return { w, why: r.why };
}

/** Does the piece on `point` stand in a mill of its own side on this board? */
export function inMill(board, point) {
  const side = board[point];
  if (!side) return false;
  return MILLS_OF[point].some((m) => m.every((p) => board[p] === side));
}

/** The mills (lists of three points) that include `point` and are complete. */
export function millsAt(board, point) {
  const side = board[point];
  if (!side) return [];
  return MILLS_OF[point].filter((m) => m.every((p) => board[p] === side));
}

/** A fresh game: an empty board, 9 pieces in each hand, the Ladybugs to move. */
export function newState() {
  return {
    board: Array(24).fill(null),
    turn: 'l',
    hand: { l: PIECES, s: PIECES },
    onBoard: { l: 0, s: 0 },
    removing: false, // the side to move closed a mill and must remove a piece
    quiet: 0, // moves in a row without a mill in the moving phase
    seen: new Map(), // position key -> how often it came up
    plies: 0, // moves played so far (removals count as moves)
  };
}

/** A copy of a state that can be changed without touching the original. */
export function cloneState(s) {
  return {
    board: s.board.slice(),
    turn: s.turn,
    hand: { ...s.hand },
    onBoard: { ...s.onBoard },
    removing: s.removing,
    quiet: s.quiet,
    seen: new Map(s.seen),
    plies: s.plies,
  };
}

/** The position as a short text: the pieces, the pieces in hand and whose turn it is. */
export function positionKey(s) {
  let k = s.turn + s.hand.l + ',' + s.hand.s + ':';
  for (const c of s.board) k += c || '.';
  return k;
}

/** What the side to move does now: place | move | fly | remove. */
export function phaseOf(s) {
  if (s.removing) return 'remove';
  if (s.hand[s.turn] > 0) return 'place';
  return s.onBoard[s.turn] <= FLY_AT ? 'fly' : 'move';
}

/** The opponent's pieces that may be removed: those outside mills, or all of them if every one is in a mill. */
export function removable(s) {
  const them = other(s.turn);
  const all = [];
  const free = [];
  for (let p = 0; p < 24; p++) {
    if (s.board[p] !== them) continue;
    all.push(p);
    if (!inMill(s.board, p)) free.push(p);
  }
  return free.length ? free : all;
}

/** The points the piece on `from` may go to now (empty if it is not the mover's piece). */
export function targetsFrom(s, from) {
  if (s.removing || s.hand[s.turn] > 0 || s.board[from] !== s.turn) return [];
  if (s.onBoard[s.turn] <= FLY_AT) {
    const free = [];
    for (let p = 0; p < 24; p++) if (!s.board[p]) free.push(p);
    return free;
  }
  return NEIGHBOURS[from].filter((p) => !s.board[p]);
}

/** Every move the side to move may play now. */
export function legalMoves(s) {
  const phase = phaseOf(s);
  const list = [];
  if (phase === 'remove') {
    for (const at of removable(s)) list.push({ k: 'x', at });
  } else if (phase === 'place') {
    for (let p = 0; p < 24; p++) if (!s.board[p]) list.push({ k: 'p', to: p });
  } else {
    for (let from = 0; from < 24; from++) {
      if (s.board[from] !== s.turn) continue;
      for (const to of targetsFrom(s, from)) list.push({ k: 'm', from, to });
    }
  }
  return list;
}

/** Is this move allowed in this state? */
export function isLegal(s, m) {
  if (!m) return false;
  const phase = phaseOf(s);
  if (m.k === 'x') return phase === 'remove' && removable(s).includes(m.at);
  if (m.k === 'p') return phase === 'place' && isPoint(m.to) && !s.board[m.to];
  if (m.k === 'm') return (phase === 'move' || phase === 'fly') && targetsFrom(s, m.from).includes(m.to);
  return false;
}

/** The turn passes to the other side, and the new position is counted. */
function passTurn(s) {
  s.turn = other(s.turn);
  const key = positionKey(s);
  s.seen.set(key, (s.seen.get(key) || 0) + 1);
}

/**
 * Plays a move that isLegal() allowed (changes s). Returns what happened, for
 * the picture: { ...move, side, mills } where mills lists the mills the
 * move closed (empty if none).
 */
export function applyMove(s, m) {
  const side = s.turn;
  const done = { ...m, side, mills: [] };
  s.plies++;
  if (m.k === 'x') {
    s.board[m.at] = null;
    s.onBoard[other(side)]--;
    s.removing = false;
    passTurn(s);
    return done;
  }
  // Moving counts towards the draw only once both hands are empty.
  const moving = m.k === 'm';
  if (m.k === 'p') {
    s.hand[side]--;
    s.onBoard[side]++;
  } else {
    s.board[m.from] = null;
  }
  s.board[m.to] = side;
  done.mills = millsAt(s.board, m.to);
  if (done.mills.length) {
    s.quiet = 0;
    // Nothing to remove if the opponent has no piece on the board yet.
    if (s.onBoard[other(side)] > 0) {
      s.removing = true;
      return done;
    }
  } else if (moving) {
    s.quiet++;
  }
  passTurn(s);
  return done;
}

/** How the position ends the game, or null while it goes on. */
export function outcomeOf(s) {
  if (s.removing) return null;
  const mover = s.turn;
  const left = s.hand[mover] + s.onBoard[mover];
  if (left < LOSE_BELOW) return { w: other(mover), why: 'pieces' };
  if (s.hand[mover] === 0 && !legalMoves(s).length) return { w: other(mover), why: 'blocked' };
  if ((s.seen.get(positionKey(s)) || 0) >= REPEAT_LIMIT) return { w: null, why: 'repetition' };
  if (s.quiet >= QUIET_LIMIT) return { w: null, why: 'quiet' };
  return null;
}

/**
 * One game: the state plus the list of all moves so far. The referee, the
 * guest's copy and a game alone each hold one of these.
 */
export function createRules() {
  let s = newState();
  let moves = [];
  const start = () => {
    s = newState();
    s.seen.set(positionKey(s), 1);
    moves = [];
  };
  start();

  const rules = {
    /** Back to the start and then play these move texts (all must be legal, the game must not be over). */
    reset(list = []) {
      start();
      for (const text of list) {
        if (rules.outcome() || !rules.move(unpackMove(text))) {
          start();
          return false;
        }
      }
      return true;
    },

    /** Plays a move { k, ... } if it is allowed. Returns what happened (see applyMove), else null. */
    move(m) {
      if (!m || !isLegal(s, m)) return null;
      const done = applyMove(s, m);
      moves.push(packMove(m));
      return done;
    },

    /** Takes back the last `count` moves (alone against the computer). */
    undo(count = 1) {
      rules.reset(moves.slice(0, Math.max(0, moves.length - count)));
    },

    get state() {
      return s;
    },
    get turn() {
      return s.turn;
    },
    get plies() {
      return moves.length;
    },
    get phase() {
      return phaseOf(s);
    },
    board: () => s.board,
    hand: (side) => s.hand[side],
    onBoard: (side) => s.onBoard[side],
    legal: () => legalMoves(s),
    targetsFrom: (point) => targetsFrom(s, point),
    removable: () => (s.removing ? removable(s) : []),
    /** Every move so far as move texts, to send or to store. */
    packed: () => moves.slice(),
    outcome: () => outcomeOf(s),
  };
  return rules;
}
