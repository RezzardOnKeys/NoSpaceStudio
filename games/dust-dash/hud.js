// Dust Dash – the HTML on top of the 3D view during and after a match: the
// round clock (a wooden sign), both scores (paper tags), the delivery label,
// the active power-up, the big status text, notices and the result (a
// receipt).

import { CONFIG, POWERS } from './config.js';
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

// Sign and colour of each power-up's round badge, in the order of POWERS.
const BADGES = [
  { sign: '↔', color: '#3f8fe0' },
  { sign: '»', color: '#e8554e' },
  { sign: '@', color: '#8a63d8' },
  { sign: '★', color: '#e2a81e' },
];

/** Starts a CSS animation on an element again from the beginning. */
function replay(el, text) {
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/** The player opened a box: the power-up's name as a big stamped word. */
export const announce = (power) => replay($('big'), `${POWERS[power]}!`);
/** Somebody else opened a box: a small paper strip under the clock. */
export const toast = (name, power) => replay($('toast'), `${name} got ${POWERS[power]}`);

/** Writes a score on its tag; the tag hops a little when the number changes. */
function setScore(el, value) {
  const text = String(value);
  if (el.textContent === text) return;
  el.textContent = text;
  if (value > 0) {
    el.classList.remove('hop');
    void el.offsetWidth; // start the animation again
    el.classList.add('hop');
  }
}

/**
 * s: { state, timeLeft, countdown, mine, other, locked, notice, delivery,
 *      power, powerT }
 * mine and other are the two scores; locked: the mouse is caught by the
 * game; notice is a network notice ('' if none); delivery is the delivery
 * of the rules; power and powerT the player's power-up (-1: none) and the
 * seconds it still lasts.
 */
export function updateHud(s) {
  const t = Math.max(0, Math.ceil(s.timeLeft));
  $('timer').textContent = clockText(t);
  setScore($('score1'), s.mine);
  setScore($('score2'), s.other);

  const d = s.delivery;
  const wait = Math.max(0, Math.ceil(d.t));
  $('deliveryText').textContent =
    d.state === 'timer'
      ? `Delivery in ${clockText(wait)}`
      : d.state === 'falling'
        ? 'Delivery incoming!'
        : 'Delivery waiting!';
  $('delivery').classList.toggle('now', d.state !== 'timer');

  $('power').hidden = s.power < 0;
  if (s.power >= 0) {
    const badge = BADGES[s.power];
    $('powerIcon').textContent = badge.sign;
    $('powerIcon').style.backgroundColor = badge.color;
    $('powerName').textContent = POWERS[s.power];
    $('powerFill').style.backgroundColor = badge.color;
    $('powerFill').style.transform = `scaleX(${Math.max(0, s.powerT / CONFIG.power.time)})`;
  }

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

/**
 * The labels during the camera tour at the end. on: show or hide them;
 * share: the cleaned part of the hall (0..1); taken / total: pieces of
 * dirt vacuumed in this round and pieces there were; k: 0..1, the numbers
 * count up while it grows.
 */
export function showTour(on, share = 0, taken = 0, total = 0, k = 1) {
  $('tour').classList.toggle('hidden', !on);
  if (!on) return;
  const e = 1 - (1 - k) * (1 - k);
  $('tourPct').textContent = String(Math.round(share * 100 * e));
  $('tourFill').style.width = `${share * 100 * e}%`;
  $('tourCount').textContent = `${Math.round(taken * e).toLocaleString('en-US')} of ${total.toLocaleString('en-US')} pieces vacuumed`;
}

export const hideResult = () => $('end').classList.add('hidden');
export const onAgain = (fn) => {
  $('again').onclick = fn;
};
