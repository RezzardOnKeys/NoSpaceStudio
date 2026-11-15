// Blind Drop – what one player sees and does: lobby, input, HUD, animations.
// Every browser runs this file. It reacts to messages from the referee
// (host.js) and sends back only its own inputs and position. In practice
// mode and for the party host the referee runs in the same browser; a party
// guest reaches it over the network (net.js). The code path is the same.

import {
  ISLAND_R, SPEED, PLAYER_R, REVEAL_MS, DROP_AT, FALL_MS, COLORS, BLAST_SIZES,
  spawnPoint, clampToIsland,
} from './config.js';
import { createView } from './scene.js';
import { createHost } from './host.js';
import { openRoom, joinRoom } from './net.js';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username> in the address.
//  Without it the game was started alone: practice mode against a bot.
//  Details: docs/PARTY-GAMES.md in the NoSpaceStudio repository.
// ---------------------------------------------------------------------
const PARTY = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const code = (h.get('party') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const role = h.get('role');
  if (!code || (role !== 'host' && role !== 'guest')) return null;
  return { code, role, name: (h.get('name') || '').slice(0, 20) };
})();

const view = createView($('view'), $('labels'));

// ---- State of this player's screen --------------------------------------
let host = null; // the referee, if it runs in this browser
let toHost = () => {}; // sends a message to the referee
let myId = null;
let roster = []; // [{ id, name, color, ready, isBot }]
let blastSize = ''; // key of BLAST_SIZES chosen for the next match
let ownerId = null; // the player who chooses the blast size (party host)
let phase = 'connecting'; // connecting | lobby | look | action | locked | reveal | result
let phaseEnd = 0;
let phaseDur = 1;
let radius = ISLAND_R;
const me = { x: 0, z: 0 };
let myBomb = null;
let lastPosSent = 0;
let lastTick = performance.now();
let netStatus = '';
const keys = new Set();
const mouse = { x: 0, y: 0, known: false };
let timeline = []; // [{ at, run }] things to do later in this phase

const playerOf = (id) => roster.find((p) => p.id === id);
const colorOf = (id) => playerOf(id)?.color ?? '#ffffff';
const nameOf = (id) => (id === myId ? 'You' : (playerOf(id)?.name ?? 'Player'));
const after = (ms, run) => timeline.push({ at: performance.now() + ms, run });

// ---- HUD helpers ----------------------------------------------------------
function setBanner(title, sub, mode) {
  $('banner').hidden = !title;
  $('banner').className = mode || '';
  $('bannerTitle').textContent = title || '';
  $('bannerSub').textContent = sub || '';
  $('timeBar').hidden = mode !== 'look' && mode !== 'go';
}

let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = !text;
  clearTimeout(toastTimer);
  if (text) toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}

// ---- Lobby ----------------------------------------------------------------
function renderLobby() {
  const mine = playerOf(myId);
  const solo = !PARTY;
  $('mode').textContent = solo ? 'Practice match against a bot' : 'Party match · 1 vs 1';

  const palette = $('palette');
  palette.replaceChildren();
  for (const c of COLORS) {
    const owner = roster.find((p) => p.color === c.hex);
    const taken = owner && owner.id !== myId && !owner.isBot;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = owner && owner.id === myId ? 'swatch mine' : 'swatch';
    b.style.setProperty('--c', c.hex);
    b.disabled = !mine || Boolean(taken);
    b.setAttribute('aria-label', taken ? `${c.name} (taken by ${owner.name})` : c.name);
    b.setAttribute('aria-pressed', String(Boolean(owner && owner.id === myId)));
    b.title = taken ? `Taken by ${owner.name}` : c.name;
    b.onclick = () => toHost({ t: 'color', color: c.hex });
    palette.appendChild(b);
  }

  // Blast size: only the host picks, everybody sees the choice.
  const canPick = Boolean(mine) && myId === ownerId;
  const sizes = $('blastSizes');
  sizes.replaceChildren();
  for (const [key, size] of Object.entries(BLAST_SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = key === blastSize ? 'size on' : 'size';
    b.textContent = size.label;
    b.disabled = !canPick;
    b.setAttribute('aria-pressed', String(key === blastSize));
    b.onclick = () => toHost({ t: 'blast', size: key });
    sizes.appendChild(b);
  }
  $('blastNote').hidden = canPick || !mine;

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

  const btn = $('readyBtn');
  const alone = roster.length < 2;
  btn.disabled = !mine || alone;
  btn.classList.toggle('on', Boolean(mine?.ready) && !solo);
  btn.textContent = solo ? 'Start' : mine?.ready ? 'Ready ✓' : 'Ready?';

  let status = netStatus;
  if (!status && !mine) status = 'Connecting to the host…';
  else if (!status && alone) status = 'Waiting for your opponent…';
  else if (!status && !solo && mine.ready) status = 'Waiting for the others…';
  $('lobbyStatus').textContent = status;
}

function enterLobby(msg) {
  phase = 'lobby';
  timeline = [];
  roster = msg.players;
  blastSize = msg.blast;
  ownerId = msg.ownerId;
  radius = ISLAND_R;
  myBomb = null;
  view.setRadius(radius, false);
  view.setAim('off');
  syncCharacters();
  roster.forEach((p, i) => {
    const spot = spawnPoint(i, roster.length);
    view.resetPose(p.id);
    view.place(p.id, spot.x, spot.z);
    view.setVisible(p.id, true);
  });
  setBanner('');
  for (const id of ['round', 'count', 'help', 'result']) $(id).hidden = true;
  $('lobby').hidden = false;
  renderLobby();
  if (msg.note) toast(msg.note);
}

function syncCharacters() {
  view.setPlayers(roster.map((p) => ({ id: p.id, color: p.color, label: nameOf(p.id) })));
}

// ---- Messages from the referee ----------------------------------------------
function onEvent(msg) {
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'welcome') myId = msg.id;
  else if (msg.t === 'lobby') enterLobby(msg);
  else if (msg.t === 'look') onLook(msg);
  else if (msg.t === 'action') onAction(msg);
  else if (msg.t === 'lock') lockInput();
  else if (msg.t === 'reveal') onReveal(msg);
}

// a) Look: both players visible, nobody can act.
function onLook(msg) {
  phase = 'look';
  timeline = [];
  radius = msg.radius;
  myBomb = null;
  phaseDur = msg.dur;
  phaseEnd = performance.now() + msg.dur;
  view.setBlast(msg.blastR);
  $('lobby').hidden = true;
  $('result').hidden = true;
  view.setRadius(radius, false);
  view.setAim('off');
  for (const p of msg.players) {
    view.resetPose(p.id);
    view.setMoving(p.id, 0, 0);
    view.appear(p.id, p.x, p.z);
    if (p.id === myId) Object.assign(me, { x: p.x, z: p.z });
  }
  $('round').textContent = `Round ${msg.round}`;
  $('round').hidden = false;
  $('help').hidden = false;
  setBanner('LOOK!', 'Remember where everyone stands', 'look');
}

// b) + c) Action: the others vanish, walk and drop your bomb once.
function onAction(msg) {
  phase = 'action';
  phaseDur = msg.dur;
  phaseEnd = performance.now() + msg.dur;
  for (const p of roster) if (p.id !== myId) view.vanish(p.id, p.color);
  setBanner('GO!', 'Move and drop your bomb', 'go');
}

function placeBomb(clientX, clientY) {
  if (phase !== 'action' || myBomb) return;
  const spot = view.groundAt(clientX, clientY);
  if (!spot) return;
  myBomb = clampToIsland(spot.x, spot.z, radius);
  view.setAim('placed', myBomb.x, myBomb.z, colorOf(myId));
  toHost({ t: 'bomb', x: myBomb.x, z: myBomb.z });
  setBanner('BOMB SET!', 'Now get out of the circle', 'go');
}

/** The action phase is over: stop and report the last position. */
function lockInput() {
  if (phase !== 'action') return;
  phase = 'locked';
  view.setMoving(myId, 0, 0);
  toHost({ t: 'final', x: me.x, z: me.z, bomb: myBomb });
  setBanner("TIME'S UP!", 'Hold still…');
  $('count').hidden = true;
}

// d) + e) Reveal: everybody is shown, the bombs fall, then the verdict.
function onReveal(msg) {
  lockInput();
  phase = 'reveal';
  $('count').hidden = true;
  setBanner('REVEAL!', 'There you are');
  for (const p of msg.players) {
    view.setMoving(p.id, 0, 0);
    view.appear(p.id, p.x, p.z);
    if (p.id === myId) Object.assign(me, { x: p.x, z: p.z });
  }
  after(DROP_AT, () => {
    view.setAim('off');
    setBanner(msg.bombs.length > 0 ? 'INCOMING!' : 'NO BOMBS!', '');
    for (const b of msg.bombs) view.dropBomb(b.x, b.z, colorOf(b.id), FALL_MS);
  });
  after(DROP_AT + FALL_MS, () => {
    for (const h of msg.hits) {
      const bomb = msg.bombs.find((b) => b.id === h.by[0]);
      view.knockout(h.id, bomb.x, bomb.z);
    }
    for (const id of msg.winners) view.cheer(id);
  });
  if (msg.outcome === 'shrink') {
    after(REVEAL_MS - 400, () => {
      radius = msg.newRadius;
      view.setRadius(radius, true);
      setBanner('NOBODY HIT!', 'The island shrinks');
    });
    after(REVEAL_MS + 600, () => {
      for (const m of msg.moved) {
        view.teleport(m.id, m.x, m.z, colorOf(m.id));
        if (m.id === myId) Object.assign(me, { x: m.x, z: m.z });
      }
    });
  } else {
    after(REVEAL_MS, () => showResult(msg));
  }
}

function showResult(msg) {
  phase = 'result';
  const iWon = msg.winners.includes(myId);
  const myHit = msg.hits.find((h) => h.id === myId);
  const title = $('resultTitle');
  let text;
  if (msg.outcome === 'draw') {
    title.textContent = 'DRAW!';
    title.className = 'logo draw';
    text = 'Nobody is left standing.';
  } else if (iWon) {
    title.textContent = 'YOU WIN!';
    title.className = 'logo';
    text = msg.hits
      .map((h) =>
        h.by.includes(myId)
          ? `Your bomb hit ${nameOf(h.id)}.`
          : `${nameOf(h.id)} stood in their own blast.`,
      )
      .join(' ');
  } else {
    title.textContent = 'YOU LOSE!';
    title.className = 'logo lose';
    text = myHit.by.includes(myId)
      ? 'You stood in your own blast.'
      : `${nameOf(myHit.by[0])}'s bomb got you.`;
  }
  $('resultText').textContent = text;
  setBanner('');
  $('help').hidden = true;
  $('round').hidden = true;
  $('result').hidden = false;
  $('rematchBtn').focus();
}

// ---- Input ----------------------------------------------------------------
const KEY_DIRS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
window.addEventListener('keydown', (e) => {
  const dir = KEY_DIRS[e.code];
  if (!dir) return;
  keys.add(dir);
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(KEY_DIRS[e.code]));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => view.resize());
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('pointermove', (e) => Object.assign(mouse, { x: e.clientX, y: e.clientY, known: true }));
$('view').addEventListener('pointerdown', (e) => {
  window.focus();
  if (e.button === 0) placeBomb(e.clientX, e.clientY);
});
$('readyBtn').onclick = () => {
  const mine = playerOf(myId);
  if (mine) toHost({ t: 'ready', ready: PARTY ? !mine.ready : true });
};
$('rematchBtn').onclick = () => toHost({ t: 'rematch' });

function walk(dt, now) {
  let dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  let dz = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  if (dx !== 0 && dz !== 0) {
    dx *= Math.SQRT1_2;
    dz *= Math.SQRT1_2;
  }
  const pos = clampToIsland(me.x + dx * SPEED * dt, me.z + dz * SPEED * dt, radius, PLAYER_R);
  Object.assign(me, pos);
  view.place(myId, me.x, me.z);
  view.setMoving(myId, dx, dz);
  if (now - lastPosSent > 100) {
    lastPosSent = now;
    toHost({ t: 'pos', x: me.x, z: me.z });
  }
  if (!myBomb && mouse.known) {
    const spot = view.groundAt(mouse.x, mouse.y);
    if (spot) {
      const aim = clampToIsland(spot.x, spot.z, radius);
      view.setAim('aim', aim.x, aim.z, colorOf(myId));
    }
  }
}

// ---- Main loop --------------------------------------------------------------
function tick() {
  const now = performance.now();
  const dt = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;

  if (host) host.tick(now);

  const due = timeline.filter((item) => item.at <= now);
  timeline = timeline.filter((item) => item.at > now);
  for (const item of due) item.run();

  if (phase === 'action') {
    walk(dt, now);
    if (now >= phaseEnd) lockInput();
  }
  if (phase === 'look' || phase === 'action') {
    const left = Math.max(0, phaseEnd - now);
    $('count').textContent = String(Math.ceil(left / 1000));
    $('count').hidden = left <= 0;
    $('timeFill').style.transform = `scaleX(${left / phaseDur})`;
  }
  return dt;
}

function frame() {
  view.update(Math.min(0.05, tick()));
  requestAnimationFrame(frame);
}
// Browsers pause animation frames in hidden tabs. This second, slower clock
// keeps the timers (and with them the referee) going when the host looks at
// another tab. Calling tick() from both is fine: it measures the time itself.
setInterval(tick, 200);

// ---- Start ----------------------------------------------------------------
function setNetStatus(text) {
  netStatus = text;
  if (phase === 'lobby' || phase === 'connecting') renderLobby();
  else if (text) toast(text);
}

if (!PARTY || PARTY.role === 'host') {
  host = createHost();
  const id = host.addPlayer({ name: PARTY ? PARTY.name || 'Host' : 'You', send: onEvent });
  toHost = (msg) => host.handle(id, msg);
  if (!PARTY) {
    host.addPlayer({ name: 'Bot', isBot: true });
  } else {
    openRoom(PARTY.code, {
      onStatus: setNetStatus,
      onJoin(conn) {
        if (host.isFull()) {
          conn.send({ t: 'full' });
          conn.close();
          return { onMessage() {}, onLeave() {} };
        }
        const guestId = host.addPlayer({ name: 'Guest', send: conn.send });
        return {
          onMessage: (msg) => host.handle(guestId, msg),
          onLeave: () => host.removePlayer(guestId),
        };
      },
    });
  }
} else {
  renderLobby();
  joinRoom(PARTY.code, {
    onStatus(text) {
      // Connection lost in the middle of a match: back to the waiting screen.
      if (text) {
        myId = null;
        enterLobby({ players: [], note: '' });
      }
      setNetStatus(text);
    },
    onOpen(send) {
      toHost = send;
      send({ t: 'hello', name: PARTY.name || 'Guest' });
    },
    onMessage: onEvent,
  });
}

requestAnimationFrame(frame);
