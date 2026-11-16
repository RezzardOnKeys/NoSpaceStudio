// Dust Dash – one player's screen: it ties everything together, reads the
// player's input, runs the frame loop and talks to the other player in a
// party match. Every browser runs this file. In a match alone and for the
// party host the referee (host.js) runs in the same browser; a party guest
// gets the state of the match over the network and shows it (guest.js).
// For now every player walks only in their own picture of the hall; the
// other player becomes visible when the party mode is finished.
//
// The files and what they do (the list grows while the game is built, the
// full plan is docs/DUST-DASH.md):
//   config.js     numbers and rules that can be tuned
//   hall.js       the hall as numbers (obstacles, start points, collision)
//   sim.js        the rules: how a player walks
//   host.js       the referee; the list of all party messages is at its top
//   guest.js      the guest's copy of a party match
//   net.js        party connection with PeerJS, ticker.js a clock for hidden tabs
//   scene.js      the 3D view (look.js comic style, hallView.js the hall)
//   controls.js   keyboard and mouse
//   lobby.js      the menu before a match, hud.js the display during a match
//                 and the receipt at the end
//   game.js       this file

import * as THREE from './vendor/three.module.js';
import { CONFIG, PALETTE, SNAP_MS, STEP, MAX_PLAYERS } from './config.js';
import { Hall } from './hall.js';
import { Sim } from './sim.js';
import { createScene } from './scene.js';
import { buildHallView } from './hallView.js';
import { createControls } from './controls.js';
import { createLobby } from './lobby.js';
import { setHudColors, showHud, updateHud, showResult, hideResult, onAgain } from './hud.js';
import { createReferee } from './host.js';
import { createMirror } from './guest.js';
import { openRoom, joinRoom } from './net.js';

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username> in the address.
//  Without it the game was started alone: a match against the bot.
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
const hall = new Hall();
const sim = new Sim(hall);
scene.add(buildHallView(hall));
// Players who asked their system for less motion get no swaying camera.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Who runs the match: the referee here, or a copy of the host's match.
const match = ROLE === 'guest' ? createMirror() : createReferee();

// ---- State of this player's screen --------------------------------------
let state = 'menu'; // menu | countdown | playing | ended
let me = null; // the player's own character
let stepTime = 0; // time not yet used up by whole steps of the rules
let clock = 0; // seconds since the page loaded (for the camera in the menu)
let stride = 0; // how far the player has walked (for the swaying camera)
let endT = 0; // seconds since the match ended
let finalScores = [0, 0]; // at the end: [mine, opponent's]
let notice = ''; // a network notice shown during a match

// What the menu shows. colors holds the palette index of seat 0 and seat 1.
const menu = {
  colors: [1, 5],
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
    if (ROLE === 'host') {
      menu.ready = false;
      toGuest({ t: 'start', colors: menu.colors });
    }
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
function beginMatch() {
  match.start(MAX_PLAYERS);
  sim.reset();
  for (let seat = 0; seat < MAX_PLAYERS; seat++) sim.addPlayer(seat);
  me = sim.players[MY_SEAT];
  controls.yaw = me.yaw;
  controls.pitch = 0;
  stepTime = 0;
  stride = 0;
  notice = '';
  state = 'countdown';
  lobby.show(false);
  hideResult();
  showHud(true);
  setHudColors(PALETTE[menu.colors[MY_SEAT]].hex, PALETTE[menu.colors[OTHER_SEAT]].hex);
}

/** scores: one number per seat. */
function endMatch(scores) {
  state = 'ended';
  endT = 0;
  finalScores = [scores[MY_SEAT] || 0, scores[OTHER_SEAT] || 0];
  controls.unlock();
  showHud(false);
}

function toMenu() {
  state = 'menu';
  match.toMenu();
  controls.unlock();
  showHud(false);
  hideResult();
  lobby.show(true);
  renderLobby();
}

onAgain(() => {
  toMenu();
  sendLobby();
});

// ---- Input --------------------------------------------------------------------
/** Turns keyboard and mouse into the input of the player's character. */
function readInput(dt) {
  controls.turnWithKeys(dt);
  const k = (code) => (controls.down(code) ? 1 : 0);
  const inp = me.input;
  inp.f = k('KeyW') - k('KeyS');
  inp.s = k('KeyD') - k('KeyA');
  inp.yaw = controls.yaw;
  inp.vac = controls.mouseDown || controls.down('KeyE');
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
      // The guest reloaded during a match: bring it back in.
      toGuest({ t: 'start', colors: menu.colors });
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
function fromHost(msg) {
  if (msg.t === 'lobby') {
    if (
      Array.isArray(msg.colors) &&
      msg.colors.every(validColor) &&
      msg.colors[0] !== msg.colors[1]
    ) {
      menu.colors = [msg.colors[0], msg.colors[1]];
    }
    menu.ready = Boolean(msg.ready);
    menu.otherName = cleanName(msg.hostName);
    menu.otherHere = true;
    if (state === 'menu') renderLobby();
    else toMenu();
  } else if (msg.t === 'start') {
    if (Array.isArray(msg.colors) && msg.colors.every(validColor)) {
      menu.colors = [msg.colors[0], msg.colors[1]];
    }
    menu.ready = false;
    beginMatch();
  } else if (msg.t === 'snap' && inMatch()) {
    match.onSnap(msg);
  } else if (msg.t === 'end' && inMatch()) {
    const sc = Array.isArray(msg.sc) ? msg.sc.map((v) => (Number.isFinite(v) ? v : 0)) : [];
    endMatch(sc);
  }
}

if (ROLE === 'host') {
  menu.colors[1] = contrastTo(menu.colors[0]);
  openRoom(PARTY.code, {
    onJoin(conn) {
      if (guestConn) {
        // Dust Dash is 1 vs 1: there is no seat for a third player.
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
  readInput(dt);
  match.step(dt);
  if (state === 'countdown' && match.state === 'playing') state = 'playing';
  if (state === 'playing') {
    stepTime += dt;
    while (stepTime >= STEP) {
      sim.updatePlayer(me, STEP);
      stepTime -= STEP;
    }
  } else {
    // Before "GO!" nobody can walk, but everybody may already look around.
    me.yaw = controls.yaw;
  }
  if (ROLE === 'guest') return;

  const now = performance.now();
  const over = match.state === 'ended';
  if (menu.otherHere && (over || now - lastSnap >= SNAP_MS)) {
    lastSnap = now;
    toGuest(match.snapshot());
  }
  if (over) {
    toGuest({ t: 'end', sc: match.scores });
    endMatch(match.scores);
  }
}

/** The camera sits in the player's head and sways a little while walking. */
function firstPerson(dt) {
  // The rules move in steps of 1/60 s; the picture glides between the last two.
  const k = state === 'playing' ? stepTime / STEP : 1;
  const x = me.px + (me.x - me.px) * k;
  const z = me.pz + (me.z - me.pz) * k;
  const speed = Math.hypot(me.vx, me.vz);
  stride += speed * dt;
  const sway = calm ? 0 : Math.sin(stride * 1.9) * 0.035 * Math.min(1, speed / CONFIG.move.walkSpeed);
  camera.position.set(x, CONFIG.move.eyeHeight + sway, z);
  camera.rotation.set(controls.pitch, controls.yaw, 0);
}

/** Behind the menu the camera looks around the hall from above. */
function menuCamera() {
  const a = calm ? 0.6 : clock * 0.06;
  camera.position.set(Math.cos(a) * 7, 3.6, Math.sin(a) * 4.5);
  camera.lookAt(Math.cos(a + 2.2) * 16, 0.8, Math.sin(a + 2.2) * 9);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = elapsed();
  advance(dt);

  if (state === 'menu') {
    menuCamera();
  } else if (state === 'ended') {
    endT += dt;
    showResult({
      mine: finalScores[0],
      other: finalScores[1],
      myName: PARTY ? PARTY.name : 'You',
      otherName: ROLE === 'solo' ? 'Bot' : menu.otherName,
      k: Math.min(1, endT / 1.5),
      canRestart: ROLE !== 'guest',
      note: ROLE === 'guest' ? 'Waiting for the host…' : '',
    });
  } else {
    firstPerson(dt);
    updateHud({
      state,
      timeLeft: match.timeLeft,
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
