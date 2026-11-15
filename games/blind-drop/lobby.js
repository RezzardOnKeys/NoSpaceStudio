// Blind Drop – the menu before a match: colour, mode, blast size, player
// list and the Ready button. The buttons are created once and only updated
// afterwards, so a keyboard user keeps the focus on the button they pressed.

import { COLORS, MODES, BLAST_SIZES } from './config.js';

const $ = (id) => document.getElementById(id);

/** Creates one button per entry and returns them as [{ key, button }]. */
function makeButtons(parent, entries, className, onPick) {
  return entries.map(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.onclick = () => onPick(key);
    parent.appendChild(button);
    return { key, button };
  });
}

/**
 * solo: true in practice mode (no party).
 * onColor(hex), onMode(key), onBlast(key), onReady() are called on clicks.
 */
export function createLobby({ solo, onColor, onMode, onBlast, onReady }) {
  const swatches = makeButtons($('palette'), COLORS.map((c) => [c.hex, '']), 'swatch', onColor);
  const modes = makeButtons(
    $('modePick'), Object.entries(MODES).map(([key, m]) => [key, m.label]), 'size', onMode,
  );
  const sizes = makeButtons(
    $('blastSizes'), Object.entries(BLAST_SIZES).map(([key, s]) => [key, s.label]), 'size', onBlast,
  );
  for (const { key, button } of swatches) button.style.setProperty('--c', key);
  $('readyBtn').onclick = onReady;
  $('subtitle').textContent = solo ? 'Practice match against a bot' : 'Party match · 1 vs 1';

  /** Marks the chosen button of a row; only the host may click. */
  function markChoice(buttons, chosen, canPick) {
    for (const { key, button } of buttons) {
      button.classList.toggle('on', key === chosen);
      button.disabled = !canPick;
      button.setAttribute('aria-pressed', String(key === chosen));
    }
  }

  /**
   * state: { roster, myId, ownerId, mode, blast, status }
   * roster is [{ id, name, color, ready, isBot }]; ownerId is the player who
   * picks mode and blast size (the party host); status is a network notice.
   */
  function render({ roster, myId, ownerId, mode, blast, status }) {
    const mine = roster.find((p) => p.id === myId);

    for (const { key, button } of swatches) {
      const name = COLORS.find((c) => c.hex === key).name;
      const owner = roster.find((p) => p.color === key);
      const isMine = Boolean(owner) && owner.id === myId;
      // A bot gives its colour away, another human keeps theirs.
      const taken = Boolean(owner) && !isMine && !owner.isBot;
      button.classList.toggle('mine', isMine);
      button.disabled = !mine || taken;
      button.title = taken ? `Taken by ${owner.name}` : name;
      button.setAttribute('aria-label', taken ? `${name} (taken by ${owner.name})` : name);
      button.setAttribute('aria-pressed', String(isMine));
    }

    const canPick = Boolean(mine) && myId === ownerId;
    markChoice(modes, mode, canPick);
    markChoice(sizes, blast, canPick);
    $('modeHint').textContent = MODES[mode].hint;
    // Snipe has one fixed, tiny blast: nothing to choose there.
    $('blastRow').hidden = mode === 'snipe';
    $('hostNote').hidden = canPick || !mine;

    const list = $('players');
    list.replaceChildren();
    for (const p of roster) {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.setProperty('--c', p.color);
      const state = p.isBot || solo ? '' : p.ready ? ' ✓ ready' : ' …';
      li.append(dot, `${p.name}${p.id === myId && !solo ? ' (you)' : ''}${state}`);
      list.appendChild(li);
    }

    const alone = roster.length < 2;
    const ready = $('readyBtn');
    ready.disabled = !mine || alone;
    ready.classList.toggle('on', Boolean(mine?.ready) && !solo);
    ready.textContent = solo ? 'Start' : mine?.ready ? 'Ready ✓' : 'Ready?';

    let text = status;
    if (!text && !mine) text = 'Connecting to the host…';
    else if (!text && alone) text = 'Waiting for your opponent…';
    else if (!text && !solo && mine.ready) text = 'Waiting for the others…';
    $('lobbyStatus').textContent = text;
  }

  return { render };
}
