// Teleport Snipe – the display during a match: the score on a paper strip
// at the top (own side left, opponent right, "First to 3"), the big text in
// the middle (countdown) and a hint at the bottom. The round card and the
// result are added in step 4 of the plan.

import { CONFIG } from './config.js';
import { css } from './lobby.js';

const $ = (id) => document.getElementById(id);
let shown = { status: null, hint: null, mine: null, other: null };

export function showHud(on) {
  $('hud').classList.toggle('hidden', !on);
}

/** Names and colours of both sides, set once per match. */
export function setHudPlayers(myName, myColor, otherName, otherColor) {
  $('myName').textContent = myName;
  $('otherName').textContent = otherName;
  $('myChip').style.backgroundColor = css(myColor);
  $('otherChip').style.backgroundColor = css(otherColor);
  $('firstTo').textContent = `First to ${CONFIG.match.roundsToWin}`;
  shown = { status: null, hint: null, mine: null, other: null };
}

/** Changes a text only when it is different, so screen readers are not flooded. */
function put(key, id, text) {
  if (shown[key] === text) return;
  shown[key] = text;
  $(id).textContent = text;
}

/**
 * s: { state, countdown, mine, other, locked, notice }
 * locked: the mouse is caught by the game; notice: a network problem.
 */
export function updateHud(s) {
  put('mine', 'myScore', String(s.mine));
  put('other', 'otherScore', String(s.other));
  put('status', 'status', s.state === 'countdown' ? String(Math.max(1, Math.ceil(s.countdown))) : '');
  let hint = s.notice;
  if (!hint && !s.locked) hint = 'Click to aim with the mouse · arrow keys work too';
  put('hint', 'hint', hint);
}
