// Teleport Snipe – the menu before a match, drawn as a wooden prayer
// plaque hanging in the garden: the player's colour (six lacquer discs),
// who duels whom and the Start / Ready button. The buttons are created once
// and only updated afterwards, so a keyboard user keeps the focus.

import { PALETTE } from './config.js';

const $ = (id) => document.getElementById(id);
export const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

function span(className, text = '') {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

/** One side of the duel: colour disc and name (index < 0: nobody there yet). */
function duelist(name, index) {
  const line = document.createElement('div');
  line.className = 'duelist';
  const chip = span('chip');
  if (index >= 0) chip.style.backgroundColor = css(PALETTE[index].hex);
  else chip.classList.add('empty');
  line.append(chip, span('name', name));
  return line;
}

/**
 * role: 'solo' (no party), 'host' or 'guest'.
 * onColor(index) and onMain() are called on clicks; onMain is the big
 * button: Start for solo and host, Ready for the guest.
 */
export function createLobby({ role, onColor, onMain }) {
  const discs = PALETTE.map((colour, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'disc';
    b.style.backgroundColor = css(colour.hex);
    b.onclick = () => onColor(i);
    $('palette').appendChild(b);
    return b;
  });
  $('start').onclick = onMain;
  $('sub').textContent =
    role === 'solo' ? 'One shot. Miss, and you teleport. Beat the bot.' : 'Party duel · 1 vs 1';

  /**
   * s: { myColor, otherColor, myName, otherName, otherHere, ready, status }
   * otherHere: the other player is connected; ready: the guest pressed Ready;
   * status: a notice from the network ('' if all is well).
   */
  function render(s) {
    discs.forEach((b, i) => {
      const mine = i === s.myColor;
      const taken = role !== 'solo' && s.otherHere && i === s.otherColor;
      const name = PALETTE[i].name;
      b.classList.toggle('on', mine);
      b.disabled = taken;
      b.title = taken ? `Taken by ${s.otherName}` : name;
      b.setAttribute('aria-label', taken ? `${name} (taken by ${s.otherName})` : name);
      b.setAttribute('aria-pressed', String(mine));
    });

    const other = role === 'solo' ? 'Bot' : s.otherName;
    const waiting = role !== 'solo' && !s.otherHere;
    const ready = role === 'host' && s.ready ? ' ✓' : '';
    $('duel').replaceChildren(
      duelist(role === 'solo' ? 'You' : `${s.myName} (you)`, s.myColor),
      span('vs', 'vs'),
      waiting ? duelist('…', -1) : duelist(other + ready, s.otherColor),
    );

    const main = $('start');
    main.style.backgroundColor = css(PALETTE[s.myColor].hex);
    let text = s.status;
    if (role === 'solo') {
      main.textContent = 'Start';
      main.disabled = false;
    } else if (role === 'host') {
      main.textContent = 'Start duel';
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
