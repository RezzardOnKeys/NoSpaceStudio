// Teleport Snipe – the display during a match: the score on a paper strip
// at the top (own side left, opponent right, "First to 3"), the big text in
// the middle (countdown), a hint at the bottom, and around the middle of
// the screen the crosshair dot, the scope when zoomed, the reload ring and
// the hit marker; "Teleported!" for a moment; the round card after a hit
// and the result at the end of the match (both paper scrolls).

import { CONFIG } from './config.js';
import { css } from './lobby.js';

const $ = (id) => document.getElementById(id);
let shown = { status: null, hint: null, mine: null, other: null, round: null };

let players = { myName: '', myColor: 0, otherName: '', otherColor: 0 };

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
  shown = { status: null, hint: null, mine: null, other: null, round: null };
  players = { myName, myColor, otherName, otherColor };
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
 * s: { state, round, countdown, mine, other, locked, notice, zoom, reload, hit }
 * locked: the mouse is caught by the game; notice: a network problem;
 * zoom: 0..1; reload: 0..1 how much of the reload is left; hit: 0..1 how
 * much of the hit marker's time is left.
 */
export function updateHud(s) {
  $('scope').style.opacity = String(Math.min(1, s.zoom * 1.6));
  // The dot is only there while a round can be played.
  const live = s.state === 'countdown' || s.state === 'playing';
  $('cross').style.opacity = live ? String(1 - Math.min(1, s.zoom * 2)) : '0';
  $('reload').style.opacity = s.reload > 0 ? '1' : '0';
  $('reloadFill').style.strokeDashoffset = String(RING * s.reload);
  $('hitMarker').style.opacity = String(s.hit);
  put('mine', 'myScore', String(s.mine));
  put('other', 'otherScore', String(s.other));
  put('status', 'status', s.state === 'countdown' ? String(Math.max(1, Math.ceil(s.countdown))) : '');
  put('round', 'roundLabel', s.state === 'countdown' ? `Round ${s.round}` : '');
  let hint = s.notice;
  if (!hint && !s.locked && (s.state === 'countdown' || s.state === 'playing')) {
    hint = 'Click to aim with the mouse · arrow keys work too';
  }
  put('hint', 'hint', hint);
}

/** Shows a short word in the middle for a moment (for example "Teleported!"). */
export function announce(text) {
  const el = $('big');
  el.textContent = text;
  el.classList.remove('show');
  // Reading the size makes the browser start the animation again.
  void el.offsetWidth;
  el.classList.add('show');
}

/** The score as two sides with colour discs and the numbers in between. */
function tally(id, mine, other) {
  const side = (name, color) => {
    const who = document.createElement('div');
    who.className = 'who';
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.backgroundColor = css(color);
    const label = document.createElement('span');
    label.textContent = name;
    who.append(chip, label);
    return who;
  };
  const num = document.createElement('div');
  num.className = 'num';
  num.textContent = `${mine} : ${other}`;
  $(id).replaceChildren(side(players.myName, players.myColor), num, side(players.otherName, players.otherColor));
}

/** The card after a round: "Round 2 – You win the round" and the score. */
export function showCard(round, won, mine, other) {
  $('cardRound').textContent = `Round ${round}`;
  const verdict = $('cardVerdict');
  verdict.textContent = won ? 'You win the round' : 'You lose the round';
  verdict.className = `verdict ${won ? 'win' : 'lose'}`;
  tally('cardTally', mine, other);
  $('card').classList.remove('hidden');
  $('card').classList.add('show');
}

export function hideCard() {
  $('card').classList.add('hidden');
  $('card').classList.remove('show');
}

/**
 * The result at the end of the match. canRestart: only the host and a
 * player alone get the "Again" button; note: a line below it.
 */
export function showResult({ won, mine, other, canRestart, note }) {
  const verdict = $('endVerdict');
  verdict.textContent = won ? 'You win!' : 'You lose';
  verdict.className = `verdict ${won ? 'win' : 'lose'}`;
  tally('endTally', mine, other);
  $('again').hidden = !canRestart;
  $('endNote').textContent = note;
  $('end').classList.remove('hidden');
}

export function hideResult() {
  $('end').classList.add('hidden');
}

export function onAgain(fn) {
  $('again').onclick = fn;
}
