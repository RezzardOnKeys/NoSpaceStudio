// Die Together – what one player sees and does: the menu with its seats.
// Every browser runs this file. It reacts to messages from the referee
// (host.js) and sends back only its own choices. For the party host the
// referee runs in the same browser; a party guest reaches it over the
// network (net.js). The code path is the same.

import { TEAMS, SEATS } from './config.js';
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

// ---- State of this player's screen --------------------------------------
let host = null; // the referee, if it runs in this browser
let toHost = () => {}; // sends a message to the referee
let myId = null;
/** The last menu state from the referee: players, seats, what is missing. */
let lobby = { players: [], expected: PARTY?.players ?? 0, botTeam: null, problem: '' };
let netStatus = '';

function show(screen) {
  for (const id of ['notice', 'lobby', 'round']) $(id).hidden = id !== screen;
}

let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = !text;
  clearTimeout(toastTimer);
  if (text) toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}

// ---- Menu -------------------------------------------------------------------
function seatButton(team, seat) {
  const owner = lobby.players.find((p) => p.team === team && p.seat === seat.id);
  const isBot = lobby.botTeam === team;
  const mine = Boolean(owner) && owner.id === myId;
  const teamName = TEAMS[team].name;

  const b = document.createElement('button');
  b.type = 'button';
  b.className = `seat${mine ? ' mine' : ''}${owner ? '' : ' free'}`;
  b.disabled = !myId || (Boolean(owner) && !mine);
  b.setAttribute('aria-pressed', String(mine));

  let who = 'Free';
  let label = `${teamName} team, ${seat.label}: free, click to sit here`;
  if (isBot) {
    who = 'Bot';
    label = `${teamName} team, ${seat.label}: bot, click to sit here instead`;
  } else if (mine) {
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
  lobby = msg;
  show('lobby');
  renderLobby();
  if (msg.note) toast(msg.note);
}

// ---- Round (only the line-up until the arena is built) ---------------------
function enterRound(msg) {
  const list = $('lineup');
  list.replaceChildren();
  for (const entry of msg.teams) {
    const team = TEAMS[entry.team];
    const li = document.createElement('li');
    li.style.setProperty('--c', team.hex);
    li.textContent = entry.isBot
      ? `${team.name} team: Bot`
      : `${team.name} team: ${entry.mouse} (mouse) + ${entry.keyboard} (keyboard)`;
    list.appendChild(li);
  }
  show('round');
}

// ---- Messages from the referee ----------------------------------------------
function onEvent(msg) {
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'welcome') myId = msg.id;
  else if (msg.t === 'lobby') enterLobby(msg);
  else if (msg.t === 'round') enterRound(msg);
}

$('startBtn').onclick = () => toHost({ t: 'start' });

// ---- Start ----------------------------------------------------------------
function setNetStatus(text) {
  netStatus = text;
  if (!$('lobby').hidden) renderLobby();
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
    setInterval(tick, 50);
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
        lobby = { ...lobby, players: [], botTeam: null, problem: '' };
        show('lobby');
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
