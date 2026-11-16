// Dust Dash – the HTML on top of the 3D view during and after a match: the
// round clock (a wooden sign), both scores (paper tags), the big status
// text, notices and the result (a receipt).

import { CONFIG } from './config.js';
import { css } from './lobby.js';

const $ = (id) => document.getElementById(id);
const clockText = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** The player's own score is always on the left, the opponent's on the right. */
export function setHudColors(mine, other) {
  $('score1').style.backgroundColor = css(mine);
  $('score2').style.backgroundColor = css(other);
  $('end1').style.color = css(mine);
  $('end2').style.color = css(other);
}

export const showHud = (on) => $('hud').classList.toggle('hidden', !on);

/**
 * s: { state, timeLeft, countdown, mine, other, locked, notice }
 * mine and other are the two scores; locked: the mouse is caught by the
 * game; notice is a network notice ('' if none).
 */
export function updateHud(s) {
  const t = Math.max(0, Math.ceil(s.timeLeft));
  $('timer').textContent = clockText(t);
  $('score1').textContent = String(s.mine);
  $('score2').textContent = String(s.other);

  let status = '';
  if (s.state === 'countdown') status = String(Math.max(1, Math.ceil(s.countdown)));
  else if (s.timeLeft > CONFIG.match.duration - 1) status = 'GO!';
  else if (s.timeLeft <= 10) status = String(t);
  $('status').textContent = status;
  $('hint').textContent =
    s.notice || (s.locked ? '' : 'Click the game to look around with the mouse');
}

/**
 * The receipt at the end. r: { mine, other, myName, otherName, k,
 * canRestart, note }. The two scores count up while k goes from 0 to 1; the
 * verdict is stamped on when they have arrived. note is shown under the
 * button.
 */
export function showResult({ mine, other, myName, otherName, k, canRestart, note }) {
  $('end').classList.remove('hidden');
  $('endName1').textContent = myName;
  $('endName2').textContent = otherName;
  const e = 1 - (1 - k) * (1 - k);
  $('end1').textContent = String(Math.round(mine * e));
  $('end2').textContent = String(Math.round(other * e));
  let title = '';
  if (k >= 1) title = mine > other ? 'You win!' : mine < other ? 'You lose' : 'Draw';
  const stamp = $('endTitle');
  stamp.textContent = title;
  stamp.classList.toggle('win', mine > other);
  stamp.classList.toggle('lose', mine < other);
  $('again').hidden = !canRestart;
  $('endNote').textContent = note;
}

export const hideResult = () => $('end').classList.add('hidden');
export const onAgain = (fn) => {
  $('again').onclick = fn;
};
