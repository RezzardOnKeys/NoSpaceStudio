// Die Together – what one player sees and does: menu, input by role, camera.
// Every browser runs this file. It reacts to messages from the referee
// (host.js) and sends back only its own inputs. For the party host the
// referee runs in the same browser; a party guest reaches it over the
// network (net.js). The code path is the same.

import { TEAMS, SEATS, EYE_H, MAX_PITCH, LOOK_MS } from './config.js';
import { createView } from './scene.js';
import { createHost } from './host.js';
import { openRoom, joinRoom } from './net.js';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username>&players=<party size>
//  in the address. Without it the game was started alone, and there is no
//  single player mode: it only shows a notice.
//  Details: docs/PARTY-GAMES.md in the NoSpaceStudio repository.
// ---------------------------------------------------------------------
const PARTY = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const code = (h.get('party') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const role = h.get('role');
  if (!code || (role !== 'host' && role !== 'guest')) return null;
  const players = Number.parseInt(h.get('players') || '', 10);
  return {
    code,
    role,
    name: (h.get('name') || '').slice(0, 20),
    // How many people the party has; null if the launcher did not say.
    players: Number.isInteger(players) && players > 0 ? players : null,
  };
})();

// A changed address (other party values) only counts after a reload.
window.addEventListener('hashchange', () => location.reload());

const canvas = $('view');
const view = createView(canvas);

// ---- State of this player's screen --------------------------------------
let host = null; // the referee, if it runs in this browser
let toHost = () => {}; // sends a message to the referee
let myId = null;
let phase = 'lobby'; // lobby | round
/** The last menu state from the referee: players, seats, what is missing. */
let lobby = { players: [], expected: PARTY?.players ?? 0, botTeam: null, problem: '' };
let netStatus = '';

/** My character and seat in the running round; null while only watching. */
let mine = null; // { team, seat: 'mouse' | 'keyboard' }
/** What is drawn for every character: `now` glides towards `goal`. */
const shown = new Map(); // team index -> { now: pose, goal: pose }
/** Mouse player: where I look. It turns at once, without asking the referee. */
const look = { yaw: 0, pitch: 0, sentYaw: 0, sentPitch: 0, sentAt: 0 };
/** Keyboard player: which keys are down right now. */
const keys = { f: false, b: false, l: false, r: false, j: false };

function show(screen) {
  $('notice').hidden = screen !== 'notice';
  $('lobby').hidden = screen !== 'lobby';
  $('hud').hidden = screen !== 'round';
}

let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = !text;
  clearTimeout(toastTimer);
  if (text) toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}

// ---- Mouse speed (remembered in this browser) -------------------------------
const SENS_KEY = 'die-together-mouse-speed';
const BASE_SENS = 0.0022; // radians per pixel of mouse movement at speed 1
let sens = 1;
try {
  const saved = Number.parseFloat(localStorage.getItem(SENS_KEY));
  if (saved >= 0.3 && saved <= 3) sens = saved;
} catch {
  // Storage can be blocked; the default speed is fine then.
}
$('sens').value = String(sens);
$('sens').oninput = () => {
  sens = Number.parseFloat($('sens').value);
  try {
    localStorage.setItem(SENS_KEY, String(sens));
  } catch {
    // Not saved, but it still applies until the game is closed.
  }
};

// ---- Menu -------------------------------------------------------------------
function seatButton(team, seat) {
  const owner = lobby.players.find((p) => p.team === team && p.seat === seat.id);
  const isBot = lobby.botTeam === team;
  const isMine = Boolean(owner) && owner.id === myId;
  const teamName = TEAMS[team].name;

  const b = document.createElement('button');
  b.type = 'button';
  b.className = `seat${isMine ? ' mine' : ''}${owner ? '' : ' free'}`;
  b.disabled = !myId || (Boolean(owner) && !isMine);
  b.setAttribute('aria-pressed', String(isMine));

  let who = 'Free';
  let label = `${teamName} team, ${seat.label}: free, click to sit here`;
  if (isBot) {
    who = 'Bot';
    label = `${teamName} team, ${seat.label}: bot, click to sit here instead`;
  } else if (isMine) {
    who = 'You';
    label = `${teamName} team, ${seat.label}: you sit here, click to stand up`;
  } else if (owner) {
    who = owner.name;
    label = `${teamName} team, ${seat.label}: taken by ${owner.name}`;
  }
  b.setAttribute('aria-label', label);
  b.title = `${seat.label}: ${seat.does}`;

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = seat.icon;
  icon.setAttribute('aria-hidden', 'true');
  const role = document.createElement('span');
  role.className = 'role';
  role.textContent = seat.label;
  const name = document.createElement('span');
  name.className = 'who';
  name.textContent = who;
  b.append(icon, role, name);

  b.onclick = () => toHost({ t: 'seat', team, seat: seat.id });
  return b;
}

function renderLobby() {
  const teams = $('teams');
  teams.replaceChildren();
  TEAMS.forEach((team, index) => {
    const card = document.createElement('section');
    card.className = 'team';
    card.style.setProperty('--c', team.hex);
    const title = document.createElement('h3');
    title.textContent = `${team.name} team`;
    card.append(title, ...SEATS.map((seat) => seatButton(index, seat)));
    teams.appendChild(card);
  });

  // Everybody who is connected, then one "joining…" for each one still loading.
  const list = $('players');
  list.replaceChildren();
  for (const p of lobby.players) {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (p.team !== null) dot.style.setProperty('--c', TEAMS[p.team].hex);
    li.append(dot, `${p.name}${p.id === myId ? ' (you)' : ''}`);
    list.appendChild(li);
  }
  for (let i = lobby.players.length; i < lobby.expected; i++) {
    const li = document.createElement('li');
    li.className = 'joining';
    li.textContent = 'joining…';
    list.appendChild(li);
  }

  // Only the host has the Start button; it explains what is still missing.
  const isHost = PARTY.role === 'host';
  const btn = $('startBtn');
  btn.hidden = !isHost;
  btn.disabled = lobby.problem !== '';

  let status = netStatus;
  if (!status && !myId) status = 'Connecting to the host…';
  else if (!status) status = lobby.problem || (isHost ? '' : 'Waiting for the host to start…');
  $('lobbyStatus').textContent = status;
}

function enterLobby(msg) {
  phase = 'lobby';
  lobby = msg;
  mine = null;
  if (document.pointerLockElement) document.exitPointerLock();
  view.setCharacters([]);
  shown.clear();
  view.lookFromAbove();
  show('lobby');
  renderLobby();
  if (msg.note) toast(msg.note);
}

// ---- Round ------------------------------------------------------------------
function enterRound(msg) {
  phase = 'round';
  view.setCharacters(msg.chars.map((c) => c.team));
  shown.clear();
  mine = null;
  for (const c of msg.chars) {
    const pose = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch };
    shown.set(c.team, { now: { ...pose }, goal: pose });
    if (c.mouse === myId) mine = { team: c.team, seat: 'mouse' };
    else if (c.keyboard === myId) mine = { team: c.team, seat: 'keyboard' };
    if (mine && mine.team === c.team) Object.assign(look, { yaw: c.yaw, pitch: c.pitch });
  }
  for (const key of Object.keys(keys)) keys[key] = false;

  const tag = $('roleTag');
  if (mine) {
    const seat = SEATS.find((s) => s.id === mine.seat);
    tag.textContent = `You are: ${seat.label}`;
    tag.style.setProperty('--c', TEAMS[mine.team].hex);
  } else {
    tag.textContent = 'Watching';
    tag.style.removeProperty('--c');
  }
  $('crosshair').hidden = !mine;
  $('endBtn').hidden = PARTY.role !== 'host';
  show('round');
}

/** New positions from the referee. Characters that are missing are out. */
function onState(msg) {
  if (phase !== 'round') return;
  const alive = msg.chars.map((c) => c.team);
  if (alive.length !== shown.size) {
    for (const team of [...shown.keys()]) if (!alive.includes(team)) shown.delete(team);
    view.setCharacters(alive);
    if (mine && !shown.has(mine.team)) {
      mine = null;
      $('roleTag').textContent = 'Watching';
      $('roleTag').style.removeProperty('--c');
      $('crosshair').hidden = true;
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }
  for (const c of msg.chars) {
    const entry = shown.get(c.team);
    if (entry) entry.goal = c;
  }
}

/** What the player has to do before the game gets their input. */
function inputHint() {
  if (phase !== 'round' || !mine) return '';
  if (mine.seat === 'mouse') return document.pointerLockElement === canvas ? '' : 'Click to aim';
  return document.hasFocus() ? '' : 'Click to take the keyboard';
}

// ---- Messages from the referee ----------------------------------------------
function onEvent(msg) {
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'welcome') myId = msg.id;
  else if (msg.t === 'lobby') enterLobby(msg);
  else if (msg.t === 'round') enterRound(msg);
  else if (msg.t === 'state') onState(msg);
}

// ---- Input ----------------------------------------------------------------
$('startBtn').onclick = () => toHost({ t: 'start' });
$('endBtn').onclick = () => toHost({ t: 'end' });
window.addEventListener('resize', () => view.resize());
window.addEventListener('contextmenu', (e) => e.preventDefault());

// A click into the game gives it the keyboard and, for the mouse player,
// locks the pointer so the mouse turns the view.
canvas.addEventListener('pointerdown', () => {
  window.focus();
  if (phase === 'round' && mine?.seat === 'mouse' && document.pointerLockElement !== canvas) {
    // Some browsers answer with a promise that fails when the lock is
    // refused; the "Click to aim" hint simply stays then.
    canvas.requestPointerLock()?.catch?.(() => {});
  }
});

document.addEventListener('mousemove', (e) => {
  if (phase !== 'round' || mine?.seat !== 'mouse') return;
  if (document.pointerLockElement !== canvas) return;
  look.yaw -= e.movementX * BASE_SENS * sens;
  look.pitch -= e.movementY * BASE_SENS * sens;
  look.pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, look.pitch));
});

const KEY_NAMES = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', Space: 'j' };

function setKey(code, down) {
  const key = KEY_NAMES[code];
  if (!key || phase !== 'round' || mine?.seat !== 'keyboard') return false;
  if (keys[key] !== down) {
    keys[key] = down;
    toHost({ t: 'keys', ...keys });
  }
  return true;
}
window.addEventListener('keydown', (e) => {
  if (setKey(e.code, true)) e.preventDefault(); // Space must not scroll or press buttons
});
window.addEventListener('keyup', (e) => setKey(e.code, false));
// Without focus no "key up" arrives, so let go of everything.
window.addEventListener('blur', () => {
  for (const code of Object.keys(KEY_NAMES)) setKey(code, false);
});

// ---- Main loop --------------------------------------------------------------
const SMOOTHING = 18; // higher = closer to the referee's state, but less smooth
let lastFrame = performance.now();

/** Moves the drawn characters a bit towards where the referee says they are. */
function glide(dt) {
  const k = 1 - Math.exp(-dt * SMOOTHING);
  for (const { now, goal } of shown.values()) {
    now.x += (goal.x - now.x) * k;
    now.y += (goal.y - now.y) * k;
    now.z += (goal.z - now.z) * k;
    now.pitch += (goal.pitch - now.pitch) * k;
    // Turn the short way round (from 350° to 10° is 20°, not 340°).
    const turn = goal.yaw - now.yaw;
    now.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * k;
  }
}

function frame(time) {
  const dt = Math.min(0.05, (time - lastFrame) / 1000);
  lastFrame = time;

  if (phase === 'round') {
    glide(dt);
    for (const [team, { now }] of shown) {
      view.placeCharacter(team, now, !mine || mine.team !== team);
    }
    const me = mine && shown.get(mine.team)?.now;
    if (me) {
      // Both players of a character see through its eyes. The mouse player
      // uses their own view direction, so turning feels instant.
      const eyes = mine.seat === 'mouse' ? look : me;
      view.lookFrom(me.x, me.y + EYE_H, me.z, eyes.yaw, eyes.pitch, mine.team);
    } else {
      view.lookFromAbove();
    }

    if (mine?.seat === 'mouse' && time - look.sentAt >= LOOK_MS) {
      if (look.yaw !== look.sentYaw || look.pitch !== look.sentPitch) {
        Object.assign(look, { sentYaw: look.yaw, sentPitch: look.pitch, sentAt: time });
        toHost({ t: 'look', yaw: look.yaw, pitch: look.pitch });
      }
    }

    const hint = inputHint();
    $('hint').textContent = hint;
    $('hint').hidden = !hint;
  }

  view.render();
  requestAnimationFrame(frame);
}

// ---- Start ----------------------------------------------------------------
function setNetStatus(text) {
  netStatus = text;
  if (phase === 'lobby') renderLobby();
  else if (text) toast(text);
}

function startAsHost() {
  host = createHost({ expected: PARTY.players });
  const id = host.addPlayer({ name: PARTY.name || 'Host', send: onEvent, isHost: true });
  toHost = (msg) => host.handle(id, msg);

  // The referee's clock. A worker keeps its pace in a hidden tab; the
  // slower timer is only the fallback if the worker cannot start.
  const tick = () => host.tick(performance.now());
  try {
    new Worker('ticker.js').onmessage = tick;
  } catch {
    setInterval(tick, 33);
  }

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

function startAsGuest() {
  show('lobby');
  renderLobby();
  joinRoom(PARTY.code, {
    onStatus(text) {
      // Connection lost: back to an empty menu until the host is there again.
      if (text) {
        myId = null;
        enterLobby({ ...lobby, players: [], botTeam: null, problem: '', note: '' });
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

if (!PARTY) show('notice');
else if (PARTY.role === 'host') startAsHost();
else startAsGuest();

requestAnimationFrame(frame);
