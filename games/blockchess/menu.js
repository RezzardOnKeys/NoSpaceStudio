// Blockchess – the menu before a game: which side to play, how strong the
// computer is (alone only), who plays against whom (party only) and the big
// Start / Ready button. The buttons are created once in index.html and only
// updated here, so a keyboard user keeps the focus.

import { SIDE_NAMES, TEAM_NAMES } from './config.js';

const $ = (id) => document.getElementById(id);

/** One line of the players list: colour chip, name and team. */
function playerLine(name, color) {
  const line = document.createElement('div');
  line.className = 'who';
  const chip = document.createElement('span');
  chip.className = 'chip ' + (color || 'none');
  const who = document.createElement('span');
  who.textContent = name;
  const team = document.createElement('span');
  team.className = 'team';
  team.textContent = color ? TEAM_NAMES[color] : '';
  line.append(chip, who, team);
  return line;
}

/**
 * role: 'solo' (no party), 'host' or 'guest'.
 * onSide(side), onLevel(level) and onMain() are called on clicks; onMain is
 * the big button: Start for solo and host, Ready for the guest.
 */
export function createMenu({ role, onSide, onLevel, onMain }) {
  const sideButtons = [...$('sides').querySelectorAll('button')];
  const levelButtons = [...$('levels').querySelectorAll('button')];
  for (const b of sideButtons) b.onclick = () => onSide(b.dataset.side);
  for (const b of levelButtons) b.onclick = () => onLevel(+b.dataset.level);
  $('start').onclick = onMain;
  $('sub').textContent = role === 'solo' ? 'Chess on a floating block island.' : 'Party game · 1 vs 1';
  $('levelBox').classList.toggle('hidden', role !== 'solo');
  $('versusBox').classList.toggle('hidden', role === 'solo');
  $('sideTitle').textContent = role === 'guest' ? 'The host picks the sides' : 'Play as';

  /**
   * s: { side: 'w' | 'b' | 'r' (what the host or the player alone plays),
   *      level, myName, otherName, otherHere, ready, status }
   * otherHere: the other player is connected; ready: the guest pressed
   * Ready; status: a notice from the network ('' if all is well).
   */
  function render(s) {
    for (const b of sideButtons) {
      // The guest sees the host's choice from its own side.
      const shown = role === 'guest' ? { w: 'b', b: 'w', r: 'r' }[s.side] : s.side;
      b.setAttribute('aria-pressed', String(b.dataset.side === shown));
      b.disabled = role === 'guest';
    }
    for (const b of levelButtons) b.setAttribute('aria-pressed', String(+b.dataset.level === s.level));

    if (role !== 'solo') {
      const hostSide = s.side === 'r' ? null : s.side;
      const guestSide = hostSide ? (hostSide === 'w' ? 'b' : 'w') : null;
      const mySide = role === 'host' ? hostSide : guestSide;
      const otherSide = role === 'host' ? guestSide : hostSide;
      const ready = role === 'host' && s.ready ? ' ✓' : '';
      $('versus').replaceChildren(
        playerLine(`${s.myName} (you)`, mySide),
        s.otherHere ? playerLine(s.otherName + ready, otherSide) : playerLine('…', null),
      );
    }

    const main = $('start');
    let text = s.status;
    if (role === 'solo') {
      main.textContent = 'Start';
      main.disabled = false;
    } else if (role === 'host') {
      main.textContent = 'Start game';
      main.disabled = !s.otherHere || !s.ready;
      if (!text) {
        text = !s.otherHere ? 'Waiting for the other player…' : s.ready ? '' : `Waiting for ${s.otherName} to be ready…`;
      }
    } else {
      main.textContent = s.ready ? 'Ready ✓' : 'Ready?';
      main.disabled = !s.otherHere;
      main.setAttribute('aria-pressed', String(s.ready));
      if (!text) {
        const pick = s.side === 'r' ? 'Sides are drawn at random.' : `You play ${SIDE_NAMES[s.side === 'w' ? 'b' : 'w']}.`;
        text = !s.otherHere ? 'Connecting to the host…' : s.ready ? `${pick} Waiting for the host to start…` : pick;
      }
    }
    $('lobbyStatus').textContent = text;
  }

  return {
    render,
    show: (on) => $('menu').classList.toggle('hidden', !on),
  };
}
