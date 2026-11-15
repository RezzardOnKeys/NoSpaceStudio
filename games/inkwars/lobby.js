// Inkwars – the menu before a match: mode (solo only), water colour, who
// plays against whom and the Start / Ready button. The buttons are created
// once and only updated afterwards, so a keyboard user keeps the focus.

import { PALETTE } from './config.js';

const $ = (id) => document.getElementById(id);
export const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

function dot(index) {
  const el = document.createElement('span');
  el.className = 'dot';
  el.style.background = css(PALETTE[index].hex);
  return el;
}

/**
 * role: 'solo' (no party), 'host' or 'guest'.
 * onColor(index), onTeamSize(1 | 2) and onMain() are called on clicks; onMain
 * is the big button: Start for solo and host, Ready for the guest.
 */
export function createLobby({ role, onColor, onTeamSize, onMain }) {
  const swatches = PALETTE.map((colour, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.style.background = css(colour.hex);
    b.onclick = () => onColor(i);
    $('palette').appendChild(b);
    return b;
  });
  const modes = [...document.querySelectorAll('.mode')];
  for (const b of modes) b.onclick = () => onTeamSize(Number(b.dataset.mode));
  $('start').onclick = onMain;
  $('modeBlock').hidden = role !== 'solo';
  $('sub').textContent =
    role === 'solo' ? 'Paint the arena. Dive in. Win the ground.' : 'Party match · 1 vs 1';

  /**
   * s: { teamSize, myColor, otherColor, myName, otherName, otherHere, ready, status }
   * otherHere: the other player is connected; ready: the guest pressed Ready;
   * status: a notice from the network ('' if all is well).
   */
  function render(s) {
    swatches.forEach((b, i) => {
      const mine = i === s.myColor;
      const taken = role !== 'solo' && s.otherHere && i === s.otherColor;
      const name = PALETTE[i].name;
      b.classList.toggle('on', mine);
      b.disabled = taken;
      b.title = taken ? `Taken by ${s.otherName}` : name;
      b.setAttribute('aria-label', taken ? `${name} (taken by ${s.otherName})` : name);
      b.setAttribute('aria-pressed', String(mine));
    });
    for (const b of modes) {
      const on = Number(b.dataset.mode) === s.teamSize;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }

    const other = role === 'solo' ? (s.teamSize === 2 ? 'Bots' : 'Bot') : s.otherName;
    const waiting = role !== 'solo' && !s.otherHere;
    const versus = $('versus');
    versus.replaceChildren(dot(s.myColor), role === 'solo' ? 'You' : `${s.myName} (you)`, ' vs ');
    if (waiting) versus.append('…');
    else versus.append(other, role === 'host' && s.ready ? ' ✓' : '', dot(s.otherColor));

    const main = $('start');
    main.style.background = css(PALETTE[s.myColor].hex);
    let text = s.status;
    if (role === 'solo') {
      main.textContent = 'Start';
      main.disabled = false;
    } else if (role === 'host') {
      main.textContent = 'Start match';
      main.disabled = waiting || !s.ready;
      if (!text)
        text = waiting
          ? 'Waiting for the other player…'
          : s.ready
            ? ''
            : `Waiting for ${other} to be ready…`;
    } else {
      main.textContent = s.ready ? 'Ready ✓' : 'Ready?';
      main.disabled = waiting;
      main.setAttribute('aria-pressed', String(s.ready));
      if (!text)
        text = waiting
          ? 'Connecting to the host…'
          : s.ready
            ? 'Waiting for the host to start…'
            : '';
    }
    $('lobbyStatus').textContent = text;
  }

  return {
    render,
    show: (on) => $('menu').classList.toggle('hidden', !on),
  };
}
