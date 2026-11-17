// Teleport Snipe – one player's screen: it ties everything together, reads
// the player's input, runs the frame loop and talks to the other player in
// a party match. Every browser runs this file. In a match alone and for the
// party host the referee (host.js) runs in the same browser; a party guest
// gets the state of the match over the network and shows it (guest.js).
//
// The files and what they do (the list grows while the game is built, the
// full plan is docs/TELEPORT-SNIPE.md):
//   config.js     every number that can be tuned
//   map.js        the temple garden as numbers (size, start points)
//   host.js       the referee; the list of all party messages is at its top
//   guest.js      the guest's copy of a party match
//   net.js        party connection with PeerJS, ticker.js a clock for hidden tabs
//   scene.js      the 3D view (mapView.js the garden, playerView.js the
//                 other player)
//   controls.js   keyboard, mouse and the mouse speed slider
//   lobby.js      the menu before a match, hud.js the display during a match
//   game.js       this file

import * as THREE from './vendor/three.module.js';
import { CONFIG, PALETTE, SNAP_MS, MAX_PLAYERS } from './config.js';
import { startOf } from './map.js';
import { createScene } from './scene.js';
import { buildMapView } from './mapView.js';
import { PlayerView } from './playerView.js';
import { createControls } from './controls.js';
import { createLobby } from './lobby.js';
import { showHud, setHudPlayers, updateHud } from './hud.js';
import { createReferee } from './host.js';
import { createMirror } from './guest.js';
import { openRoom, joinRoom } from './net.js';

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username> in the address.
//  Without it the game was started alone: a duel against the bot.
//  Details: docs/PARTY-GAMES.md in the NoSpaceStudio repository.
// ---------------------------------------------------------------------
const cleanName = (v) => (typeof v === 'string' ? v.trim().slice(0, 20) : '') || 'Player';
const PARTY = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const code = (h.get('party') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const role = h.get('role');
  if (!code || (role !== 'host' && role !== 'guest')) return null;
  return { code, role, name: cleanName(h.get('name')) };
})();
const ROLE = PARTY ? PARTY.role : 'solo'; // solo | host | guest
// Seats: 0 is the host (or the player alone), 1 the guest (or the bot).
const MY_SEAT = ROLE === 'guest' ? 1 : 0;
const OTHER_SEAT = 1 - MY_SEAT;
const validColor = (v) => Number.isInteger(v) && v >= 0 && v < PALETTE.length;

// ---- The world ------------------------------------------------------------
const canvas = document.getElementById('game');
const { renderer, scene, camera } = createScene(canvas);
scene.add(buildMapView());
// Players who asked their system for less motion get a still menu camera.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Who runs the match: the referee here, or a copy of the host's match.
const match = ROLE === 'guest' ? createMirror() : createReferee();

// ---- State of this player's screen --------------------------------------
let state = 'menu'; // menu | countdown | playing
let other = null; // the other player's figure
let clock = 0; // seconds since the page loaded (for the camera in the menu)
let notice = ''; // a network notice shown during a match

// What the menu shows. colors holds the palette index of seat 0 and seat 1.
const menu = {
  colors: [0, 3],
  ready: false,
  otherName: 'Player',
  otherHere: false,
  status: '',
};

// Party connection
let toHost = () => {}; // guest: sends a message to the host
let guestConn = null; // host: the guest's connection
let lastSnap = 0;

const inMatch = () => state === 'countdown' || state === 'playing';
const controls = createControls(canvas, inMatch);
controls.bindSpeedSlider(document.getElementById('sens'), document.getElementById('sensValue'));

// ---- Menu -------------------------------------------------------------------
function hue(index) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(PALETTE[index].hex).getHSL(hsl);
  return hsl.h;
}
/** The palette colour that is furthest away from colour i. */
function contrastTo(i) {
  let best = 0;
  let bestDist = -1;
  PALETTE.forEach((_, j) => {
    let d = Math.abs(hue(j) - hue(i));
    d = Math.min(d, 1 - d);
    if (d > bestDist) {
      bestDist = d;
      best = j;
    }
  });
  return best;
}

const lobby = createLobby({
  role: ROLE,
  onColor(i) {
    if (ROLE === 'guest') {
      if (i === menu.colors[0]) return;
      menu.colors[1] = i;
      toHost({ t: 'color', color: i });
    } else {
      menu.colors[0] = i;
      // The bot's colour follows; in a party the host goes first.
      if (ROLE === 'solo' || menu.colors[1] === i) menu.colors[1] = contrastTo(i);
      sendLobby();
    }
    renderLobby();
  },
  onMain() {
    if (ROLE === 'guest') {
      menu.ready = !menu.ready;
      toHost({ t: 'ready', ready: menu.ready });
      renderLobby();
      return;
    }
    if (ROLE === 'host' && !(menu.otherHere && menu.ready)) return;
    menu.ready = false;
    if (ROLE === 'host') toGuest({ t: 'start', hostName: PARTY.name, colors: menu.colors });
    beginMatch();
    controls.lock();
  },
});

function renderLobby() {
  lobby.render({
    myColor: menu.colors[MY_SEAT],
    otherColor: menu.colors[OTHER_SEAT],
    myName: PARTY ? PARTY.name : 'You',
    otherName: menu.otherName,
    otherHere: menu.otherHere,
    ready: menu.ready,
    status: menu.status,
  });
}

// ---- Match ------------------------------------------------------------------
const otherLabel = () => (ROLE === 'solo' ? 'Bot' : menu.otherName);

function beginMatch() {
  match.start();
  if (other) scene.remove(other.group);
  other = new PlayerView(PALETTE[menu.colors[OTHER_SEAT]].hex);
  scene.add(other.group);
  placePlayers();
  notice = '';
  state = match.state;
  lobby.show(false);
  showHud(true);
  setHudPlayers(
    PARTY ? PARTY.name : 'You',
    PALETTE[menu.colors[MY_SEAT]].hex,
    otherLabel(),
    PALETTE[menu.colors[OTHER_SEAT]].hex,
  );
}

/** Both players stand at their start points of the current round. */
function placePlayers() {
  const mine = startOf(MY_SEAT, match.round);
  controls.yaw = mine.yaw;
  controls.pitch = 0;
  const theirs = startOf(OTHER_SEAT, match.round);
  other.place(theirs.x, 0, theirs.z, theirs.yaw);
}

function toMenu() {
  state = 'menu';
  match.toMenu();
  controls.unlock();
  showHud(false);
  if (other) scene.remove(other.group);
  other = null;
  lobby.show(true);
  renderLobby();
}

// ---- Party: host side -----------------------------------------------------------
function toGuest(msg) {
  if (guestConn && menu.otherHere) guestConn.send(msg);
}
function sendLobby() {
  if (ROLE !== 'host') return;
  toGuest({ t: 'lobby', hostName: PARTY.name, colors: menu.colors, ready: menu.ready });
}
function takeGuestColor(color) {
  if (validColor(color) && color !== menu.colors[0]) menu.colors[1] = color;
  if (menu.colors[1] === menu.colors[0]) menu.colors[1] = contrastTo(menu.colors[0]);
}

function fromGuest(msg) {
  if (msg.t === 'hello') {
    menu.otherHere = true;
    menu.otherName = cleanName(msg.name);
    menu.ready = false;
    notice = '';
    if (inMatch()) {
      // The guest reloaded during a match: bring it back in. The next
      // snapshot tells it the round, the score and the countdown.
      toGuest({ t: 'start', hostName: PARTY.name, colors: menu.colors });
      toGuest(match.snapshot());
    } else {
      takeGuestColor(msg.color);
      sendLobby();
    }
    renderLobby();
  } else if (msg.t === 'color' && state === 'menu') {
    takeGuestColor(msg.color);
    sendLobby();
    renderLobby();
  } else if (msg.t === 'ready' && state === 'menu') {
    menu.ready = Boolean(msg.ready);
    sendLobby();
    renderLobby();
  }
}

function guestLeft() {
  guestConn = null;
  menu.otherHere = false;
  menu.ready = false;
  if (inMatch()) notice = 'Your opponent left. Waiting for them to come back…';
  renderLobby();
}

// ---- Party: guest side ------------------------------------------------------------
function takeColors(colors) {
  if (Array.isArray(colors) && colors.length === MAX_PLAYERS && colors.every(validColor) && colors[0] !== colors[1]) {
    menu.colors = [colors[0], colors[1]];
  }
}

function fromHost(msg) {
  if (msg.t === 'lobby') {
    takeColors(msg.colors);
    menu.ready = Boolean(msg.ready);
    menu.otherName = cleanName(msg.hostName);
    menu.otherHere = true;
    if (state === 'menu') renderLobby();
    else toMenu();
  } else if (msg.t === 'start') {
    takeColors(msg.colors);
    menu.ready = false;
    // A guest who reloaded has not seen the menu: the name comes along here.
    menu.otherName = cleanName(msg.hostName);
    menu.otherHere = true;
    beginMatch();
  } else if (msg.t === 'snap' && inMatch()) {
    const round = match.round;
    match.onSnap(msg);
    if (match.round !== round) placePlayers();
  }
}

if (ROLE === 'host') {
  menu.colors[1] = contrastTo(menu.colors[0]);
  openRoom(PARTY.code, {
    onJoin(conn) {
      if (guestConn) {
        // Teleport Snipe is 1 vs 1: there is no seat for a third player.
        conn.send({ t: 'full' });
        conn.close();
        return { onMessage() {}, onLeave() {} };
      }
      guestConn = conn;
      return { onMessage: fromGuest, onLeave: guestLeft };
    },
    onStatus(text) {
      menu.status = text;
      renderLobby();
    },
  });
  // Keeps the match running while the host looks at another tab.
  try {
    const ticker = new Worker('ticker.js');
    ticker.onmessage = () => {
      if (document.hidden) advance(elapsed());
    };
  } catch {
    /* without the worker the match pauses while the host's tab is hidden */
  }
} else if (ROLE === 'guest') {
  joinRoom(PARTY.code, {
    onOpen(send) {
      toHost = send;
      send({ t: 'hello', name: PARTY.name, color: menu.colors[1] });
    },
    onMessage: fromHost,
    onStatus(text) {
      menu.status = text;
      if (text) {
        // The connection is gone: wait in the menu until the host is back.
        menu.otherHere = false;
        menu.ready = false;
        toHost = () => {};
        if (state !== 'menu') toMenu();
      }
      renderLobby();
    },
  });
} else {
  menu.colors[1] = contrastTo(menu.colors[0]);
}
renderLobby();

// ---- Main loop ------------------------------------------------------------------
let last = performance.now();
/** Seconds since the last call, at most a tenth of a second. */
function elapsed() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  return dt;
}

/** Moves the match on: input, the rules (or the copy of them) and the network. */
function advance(dt) {
  clock += dt;
  if (!inMatch()) return;
  controls.turnWithKeys(dt);
  match.step(dt);
  state = match.state;
  if (ROLE !== 'host' || !menu.otherHere) return;
  const now = performance.now();
  if (now - lastSnap >= SNAP_MS) {
    lastSnap = now;
    toGuest(match.snapshot());
  }
}

/** The camera sits in the player's head at the own start point. */
function firstPerson() {
  const mine = startOf(MY_SEAT, match.round);
  camera.position.set(mine.x, CONFIG.look.eyeHeight, mine.z);
  camera.rotation.set(controls.pitch, controls.yaw, 0);
}

/** Behind the menu the camera circles slowly over the garden. */
function menuCamera() {
  const a = calm ? 0.8 : clock * 0.05;
  camera.position.set(Math.cos(a) * 17, 7, Math.sin(a) * 17);
  camera.lookAt(Math.cos(a + 2.4) * 10, 1, Math.sin(a + 2.4) * 10);
}

function frame() {
  requestAnimationFrame(frame);
  advance(elapsed());
  if (state === 'menu') {
    menuCamera();
  } else {
    firstPerson();
    updateHud({
      state,
      countdown: match.countdown,
      mine: match.scores[MY_SEAT],
      other: match.scores[OTHER_SEAT],
      locked: controls.locked(),
      notice,
    });
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
