// Blind Drop – the HTML on top of the 3D view during a match: banner with
// the time bar, big countdown number, round label, short notices, and the
// result screen. Only shows things; game.js decides what and when.

const $ = (id) => document.getElementById(id);

/** The banner at the top. `mode` 'look' or 'go' also shows the time bar. */
export function setBanner(title, sub, mode) {
  $('banner').hidden = !title;
  $('banner').className = mode || '';
  $('bannerTitle').textContent = title || '';
  $('bannerSub').textContent = sub || '';
  $('timeBar').hidden = mode !== 'look' && mode !== 'go';
}

let toastTimer = 0;
/** A short notice in the corner that disappears by itself. */
export function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = !text;
  clearTimeout(toastTimer);
  if (text) toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}

/** Big number and time bar: `left` of `total` milliseconds remain. */
export function setCountdown(left, total) {
  $('count').textContent = String(Math.ceil(left / 1000));
  $('count').hidden = left <= 0;
  $('timeFill').style.transform = `scaleX(${Math.max(0, left) / total})`;
}

export function hideCountdown() {
  $('count').hidden = true;
}

/**
 * Which screen is in front: 'lobby' (menu), 'match' (only the HUD) or
 * 'result'. For 'match', `round` is the round number to show.
 */
export function showScreen(name, round) {
  $('lobby').hidden = name !== 'lobby';
  $('result').hidden = name !== 'result';
  $('round').hidden = name !== 'match';
  $('help').hidden = name !== 'match';
  if (name === 'match') $('round').textContent = `Round ${round}`;
  if (name !== 'match') {
    setBanner('');
    hideCountdown();
  }
}

/** Fills and shows the result screen. tone: 'win' | 'lose' | 'draw'. */
export function showResult({ title, tone, text }) {
  $('resultTitle').textContent = title;
  $('resultTitle').className = tone === 'win' ? 'logo' : `logo ${tone}`;
  $('resultText').textContent = text;
  showScreen('result');
  $('rematchBtn').focus();
}

export function onRematch(handler) {
  $('rematchBtn').onclick = handler;
}

/** Snipe has a dark sky and a dark HUD with a red accent (see index.html). */
export function setSnipeLook(on) {
  document.body.classList.toggle('snipe', on);
}
