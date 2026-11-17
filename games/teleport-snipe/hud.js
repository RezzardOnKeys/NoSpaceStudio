// Teleport Snipe – the display during a match: the score on a paper strip
// at the top (own side left, opponent right, "First to 3"), the big text in
// the middle (countdown), a hint at the bottom, and around the middle of
// the screen the crosshair dot, the scope when zoomed, the reload ring and
// the hit marker. The round card and the result are added in step 4 of the
// plan.

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

// The length of the reload ring's circle (2 * pi * 16).
const RING = 100.5;

/**
 * s: { state, countdown, mine, other, locked, notice, zoom, reload, hit }
 * locked: the mouse is caught by the game; notice: a network problem;
 * zoom: 0..1; reload: 0..1 how much of the reload is left; hit: 0..1 how
 * much of the hit marker's time is left.
 */
export function updateHud(s) {
  $('scope').style.opacity = String(Math.min(1, s.zoom * 1.6));
  $('cross').style.opacity = String(1 - Math.min(1, s.zoom * 2));
  $('reload').style.opacity = s.reload > 0 ? '1' : '0';
  $('reloadFill').style.strokeDashoffset = String(RING * s.reload);
  $('hitMarker').style.opacity = String(s.hit);
  put('mine', 'myScore', String(s.mine));
  put('other', 'otherScore', String(s.other));
  put('status', 'status', s.state === 'countdown' ? String(Math.max(1, Math.ceil(s.countdown))) : '');
  let hint = s.notice;
  if (!hint && !s.locked) hint = 'Click to aim with the mouse · arrow keys work too';
  put('hint', 'hint', hint);
}
