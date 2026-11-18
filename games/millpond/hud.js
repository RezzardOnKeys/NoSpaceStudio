// Millpond – everything on top of the 3D view during a game: the status
// line at the top (whose turn, which phase), the side panel (players with
// their pieces in hand and lost, buttons), a notice line and the result at
// the end.

import { SIDE_NAMES } from './config.js';
import { other, PIECES } from './rules.js';

const $ = (id) => document.getElementById(id);
const lower = (side) => SIDE_NAMES[side].toLowerCase();

/** What a result means for the player who plays `me`; names: { l, s } -> player names. */
export function describeResult(r, me, names) {
  const loser = r.w ? other(r.w) : null;
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
    pieces: loser && `The ${lower(loser)} have only 2 pieces left.`,
    blocked: loser && `The ${lower(loser)} cannot move any piece.`,
    resign: loser && (loser === me ? 'You resigned.' : `${names[loser]} resigned.`),
    repetition: 'The same position came up for the third time.',
    quiet: '50 moves in a row without a mill.',
  }[r.why];
  return { title, text, mood };
}

export function createHud() {
  let toastTimer = 0;

  return {
    show: (on) => $('hud').classList.toggle('hidden', !on),

    /** alert: the line stands out (a mill to remove, the own turn). */
    setStatus(text, alert) {
      $('status').textContent = text;
      $('status').classList.toggle('alert', !!alert);
    },

    /**
     * players: [{ name, side, hand, onBoard }] (own line first),
     * turn: the side to move (null after the game).
     */
    setPlayers(players, turn) {
      $('players').replaceChildren(
        ...players.flatMap((p) => {
          const line = document.createElement('div');
          line.className = 'who' + (p.side === turn ? ' turn' : '');
          const chip = document.createElement('span');
          chip.className = 'chip ' + p.side;
          const name = document.createElement('span');
          name.textContent = p.name;
          const team = document.createElement('span');
          team.className = 'team';
          team.textContent = SIDE_NAMES[p.side];
          line.append(chip, name, team);
          const count = document.createElement('div');
          count.className = 'count';
          const lost = PIECES - p.hand - p.onBoard;
          count.textContent = `To place: ${p.hand} · On the board: ${p.onBoard} · Lost: ${lost}`;
          return [line, count];
        }),
      );
    },

    /** resign: 'resign' | 'confirm' | 'result' ('result' after the game: the button shows the result again). */
    setButtons({ resign, resignEnabled }) {
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
