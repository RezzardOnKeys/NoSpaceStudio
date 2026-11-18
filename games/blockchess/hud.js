// Blockchess – everything on top of the 3D view during a game: the status
// line at the top, the side panel (players, move list, buttons), a notice
// line, the name of the piece under the mouse, the choice for a promoted pawn
// and the result at the end.

import { SIDE_NAMES, TEAM_NAMES } from './config.js';
import { ROSTER, PIECE_NAMES } from './pieces.js';

const $ = (id) => document.getElementById(id);

/** What a result means for the player who plays `me` (null: watching both sides). */
export function describeResult(r, me, names) {
  const winner = r.w ? names[r.w] : '';
  const loser = r.w ? names[r.w === 'w' ? 'b' : 'w'] : '';
  let title;
  let mood = '';
  if (!r.w) title = 'Draw';
  else if (r.w === me) {
    title = 'You win!';
    mood = 'win';
  } else {
    title = 'You lose';
    mood = 'lose';
  }
  const text = {
    checkmate: me ? 'Checkmate.' : `Checkmate. ${winner} wins.`,
    resign: me && r.w !== me ? 'You resigned.' : `${loser} resigned.`,
    stalemate: 'Stalemate: the side to move has no legal move but is not in check.',
    repetition: 'The same position came up three times.',
    material: 'Not enough pieces left to checkmate.',
    fifty: 'Fifty moves in a row without a pawn move or a capture.',
  }[r.why];
  return { title, text, mood };
}

export function createHud() {
  let toastTimer = 0;

  return {
    show: (on) => $('hud').classList.toggle('hidden', !on),

    setStatus(text, check) {
      $('status').textContent = text;
      $('status').classList.toggle('check', !!check);
    },

    /** players: [{ name, color }] (own line first), turn: the side to move. */
    setPlayers(players, turn) {
      $('players').replaceChildren(
        ...players.map((p) => {
          const line = document.createElement('div');
          line.className = 'who' + (p.color === turn ? ' turn' : '');
          const chip = document.createElement('span');
          chip.className = 'chip ' + p.color;
          const name = document.createElement('span');
          name.textContent = p.name;
          const team = document.createElement('span');
          team.className = 'team';
          team.textContent = TEAM_NAMES[p.color];
          line.append(chip, name, team);
          return line;
        }),
      );
    },

    /** The move list in short notation, two half moves per line. */
    setMoves(list) {
      const ol = $('moves');
      const rows = [];
      for (let i = 0; i < list.length; i += 2) {
        const li = document.createElement('li');
        const white = document.createElement('span');
        white.textContent = list[i];
        li.append(white, list[i + 1] ?? '');
        rows.push(li);
      }
      ol.replaceChildren(...rows);
      ol.scrollTop = ol.scrollHeight;
    },

    /**
     * undo: { shown, enabled }; resign: 'resign' | 'confirm' | 'result'
     * ('result' after the game: the button shows the result again).
     */
    setButtons({ undo, resign, resignEnabled }) {
      $('undo').classList.toggle('hidden', !undo.shown);
      $('undo').disabled = !undo.enabled;
      const b = $('resign');
      b.textContent = { resign: 'Resign', confirm: 'Really resign?', result: 'Result' }[resign];
      b.classList.toggle('danger', resign !== 'result');
      b.disabled = !resignEnabled;
    },

    /** A notice below the status line; sticky ones stay until toast(''). */
    toast(text, sticky = false) {
      clearTimeout(toastTimer);
      $('toast').textContent = text;
      $('toast').classList.toggle('hidden', !text);
      if (text && !sticky) toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 3500);
    },

    /** The name of the piece under the mouse, next to the pointer (piece = null hides it). */
    tip(piece, x, y) {
      const tip = $('tip');
      if (!piece) {
        tip.classList.add('hidden');
        return;
      }
      const u = piece.userData;
      tip.textContent = `${u.name} · ${PIECE_NAMES[u.type]} (${SIDE_NAMES[u.color]})`;
      tip.style.left = Math.min(x + 14, window.innerWidth - 220) + 'px';
      tip.style.top = y + 14 + 'px';
      tip.classList.remove('hidden');
    },

    /** Asks which piece a pawn becomes. Resolves with 'q', 'r', 'b', 'n' or null (Escape). */
    choosePromotion(color) {
      return new Promise((resolve) => {
        const box = $('promoChoices');
        const done = (t) => {
          $('promo').classList.add('hidden');
          window.removeEventListener('keydown', onKey);
          resolve(t);
        };
        const onKey = (e) => {
          if (e.key === 'Escape') done(null);
        };
        box.replaceChildren(
          ...['q', 'r', 'b', 'n'].map((t) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = `${ROSTER[color][t][0]} (${PIECE_NAMES[t]})`;
            b.onclick = () => done(t);
            return b;
          }),
        );
        window.addEventListener('keydown', onKey);
        $('promo').classList.remove('hidden');
        box.firstChild.focus();
      });
    },

    closePromotion() {
      $('promo').classList.add('hidden');
    },

    /**
     * The result card. again: label of the first button ('' hides it),
     * menu: show the Menu button, note: a line below the buttons.
     */
    showResult({ title, text, mood, again, menu, note }) {
      $('endTitle').textContent = title;
      $('endTitle').className = mood;
      $('endText').textContent = text;
      $('again').textContent = again;
      $('again').classList.toggle('hidden', !again);
      $('toMenu').classList.toggle('hidden', !menu);
      $('endNote').textContent = note || '';
      $('end').classList.remove('hidden');
    },

    hideResult() {
      $('end').classList.add('hidden');
    },
  };
}
