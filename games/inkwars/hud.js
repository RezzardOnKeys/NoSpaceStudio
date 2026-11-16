// Inkwars – the HTML on top of the 3D view during and after a match: clock,
// score bar, health, tank, big status text, hints and the result card.

import { CONFIG } from './config.js';
import { css } from './lobby.js';

const $ = (id) => document.getElementById(id);
const clockText = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** The player's colour is always on the left, the opponent's on the right. */
export function setHudColors(mine, other) {
  $('p1').style.background = css(mine);
  $('p2').style.background = css(other);
  $('tankFill').style.background = css(mine);
  $('end1').style.color = css(mine);
  $('end2').style.color = css(other);
}

export const showHud = (on) => $('hud').classList.toggle('hidden', !on);

/**
 * s: { state, timeLeft, countdown, me, minePct, otherPct, locked, notice }
 * me is the player's character; notice is a network notice ('' if none).
 */
export function updateHud(s) {
  const me = s.me;
  const t = Math.max(0, Math.ceil(s.timeLeft));
  $('timer').textContent = clockText(t);
  $('p1').style.width = s.minePct + '%';
  $('p2').style.width = s.otherPct + '%';
  $('pct1').textContent = s.minePct.toFixed(1) + ' %';
  $('pct2').textContent = s.otherPct.toFixed(1) + ' %';
  $('tankFill').style.height = (me.tank / CONFIG.weapon.tank) * 100 + '%';
  $('tank').classList.toggle('refill', me.fish && me.inOwnInk && me.tank < CONFIG.weapon.tank);
  $('hpFill').style.width = Math.max(0, me.hp) + '%';
  $('hurt').style.opacity = String(me.alive ? (1 - me.hp / CONFIG.actor.hp) * 0.9 : 0.6);
  $('cross').style.opacity = me.alive && !me.fish ? '1' : '0.25';

  let status = '';
  if (s.state === 'countdown') status = String(Math.max(1, Math.ceil(s.countdown)));
  else if (!me.alive) status = `Soaked! ${Math.max(1, Math.ceil(me.respawnT))}`;
  else if (s.timeLeft > CONFIG.match.duration - 1) status = 'GO!';
  else if (s.timeLeft <= 10) status = String(t);
  $('status').textContent = status;

  let hint = s.notice;
  if (!hint && !s.locked) hint = 'Click the game to aim with the mouse';
  else if (!hint && me.alive && me.tank < CONFIG.weapon.shotCost) {
    hint = 'Tank empty – hold Shift and refill in your own water';
  }
  $('hint').textContent = hint;
}

/**
 * The result card. The two numbers count up while k goes from 0 to 1; the
 * verdict appears when they have arrived. note is shown under the button.
 */
export function showResult(minePct, otherPct, k, canRestart, note) {
  $('end').classList.remove('hidden');
  const e = 1 - (1 - k) * (1 - k);
  $('end1').textContent = (minePct * e).toFixed(1) + ' %';
  $('end2').textContent = (otherPct * e).toFixed(1) + ' %';
  let title = '';
  if (k >= 1) title = minePct > otherPct ? 'You win!' : minePct < otherPct ? 'You lose' : 'Draw';
  $('endTitle').textContent = title;
  $('again').hidden = !canRestart;
  $('endNote').textContent = note;
}

/** A short message in the middle when the player's side soaked an opponent. */
export function showKill(text) {
  const el = $('kill');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth; // start the animation again
  el.classList.add('show');
}

export const hideResult = () => $('end').classList.add('hidden');
export const onAgain = (fn) => {
  $('again').onclick = fn;
};
