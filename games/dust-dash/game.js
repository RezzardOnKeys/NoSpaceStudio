// Dust Dash – one player's screen: it ties everything together, reads the
// player's input, runs the frame loop and talks to the other player in a
// party match. Every browser runs this file. In a match alone and for the
// party host the referee (host.js) runs in the same browser; a party guest
// gets the state of the match over the network and shows it, moving only
// its own character ahead by itself (guest.js).
//
// The files and what they do (the list grows while the game is built, the
// full plan is docs/DUST-DASH.md):
//   config.js     numbers and rules that can be tuned
//   hall.js       the hall as numbers (obstacles, start points, collision)
//   dirt.js       the pieces of dirt from a seed, and which are still there
//   sim.js        the rules: walking, vacuuming, deliveries, power-ups
//   nav.js        walking distances around the obstacles (fair deliveries, the bot's way)
//   host.js       the referee; the list of all party messages is at its top
//   bot.js        the bot you play against alone
//   feed.js       the guest's keys on the host, one step at a time
//   guest.js      the guest's copy of a party match
//   wire.js       how players, inputs and dirt lists are packed for the network
//   net.js        party connection with PeerJS, ticker.js a clock for hidden tabs
//   scene.js      the 3D view (look.js comic style, hallView.js the hall,
//                 dirtView.js the dirt and the dust film, viewModel.js the
//                 player's own vacuum, playerView.js the other player,
//                 effects.js the delivery box)
//   marker.js     the delivery icon on the screen (also through walls)
//   tour.js       the camera flight through the hall when the time is up
//   controls.js   keyboard and mouse
//   lobby.js      the menu before a match, hud.js the display during a match
//                 and the receipt at the end
//   game.js       this file

import * as THREE from './vendor/three.module.js';
import { CONFIG, PALETTE, SNAP_MS, INPUT_MS, STEP, MAX_PLAYERS } from './config.js';
import { Hall } from './hall.js';
import { Dirt } from './dirt.js';
import { Sim } from './sim.js';
import { Nav } from './nav.js';
import { createScene } from './scene.js';
import { buildHallView } from './hallView.js';
import { createFilm, createDirtView } from './dirtView.js';
import { createViewModel } from './viewModel.js';
import { PlayerView } from './playerView.js';
import { createEffects } from './effects.js';
import { createMarker } from './marker.js';
import { createTour } from './tour.js';
import { createControls } from './controls.js';
import { createLobby } from './lobby.js';
import {
  setHudColors,
  showHud,
  updateHud,
  showResult,
  hideResult,
  onAgain,
  announce,
  toast,
  showTour,
} from './hud.js';
import { createReferee } from './host.js';
import { createFeed } from './feed.js';
import { packIds } from './wire.js';
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
const dirt = new Dirt(hall);
const sim = new Sim(hall, dirt, new Nav(hall));
// Players who asked their system for less motion get no swaying or shaking.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const film = createFilm(hall);
scene.add(buildHallView(hall, film));
const vacuum = createViewModel(hall, calm);
scene.add(vacuum.group);
const dirtView = createDirtView(dirt, nozzleOf);
scene.add(dirtView.group);
const effects = createEffects(hall, calm);
scene.add(effects.group);
const marker = createMarker();
const tour = createTour(camera, calm);

/** Where the nozzle of a seat's player is: pieces of dirt fly there. */
function nozzleOf(seat, out) {
  if (me && seat === me.seat) return vacuum.mouth(out);
  const p = sim.players[seat];
  if (!p) return out.set(0, 0.2, 0);
  return out.set(p.x - Math.sin(p.yaw) * 0.7, 0.2, p.z - Math.cos(p.yaw) * 0.7);
}

// Who runs the match: the referee here, or a copy of the host's match.
// The party host plays the guest's keys back one step at a time (feed.js).
const feed = createFeed();
const match =
  ROLE === 'guest'
    ? createMirror({ sim, mySeat: MY_SEAT })
    : createReferee({
        sim,
        beforeStep: () => {
          if (guestPlayer && guestPlayer.external) feed.play(guestPlayer, sim, STEP);
        },
      });

// ---- State of this player's screen --------------------------------------
let state = 'menu'; // menu | countdown | playing | ended
let me = null; // the player's own character
let views = []; // the other players' characters: { seat, view }
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
let guestPlayer = null; // host: the guest's character
let netRemoved = []; // host: per seat, the pieces taken since the last snapshot
let netOpened = []; // host: boxes opened since the last snapshot
let lastSnap = 0;
let lastInput = 0;

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
    if (ROLE === 'host') {
      menu.ready = false;
    }
    // A new number for every match: the dirt lies differently each time.
    const seed = 1 + Math.floor(Math.random() * 2147483000);
    if (ROLE === 'host') toGuest({ t: 'start', hostName: PARTY.name, colors: menu.colors, seed });
    beginMatch(seed);
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
/** seed: the number the dirt is laid out from (the same on both screens). */
function beginMatch(seed) {
  // Alone, the other seat is played by the bot.
  match.start(MAX_PLAYERS, seed, ROLE === 'solo' ? [OTHER_SEAT] : []);
  me = sim.players[MY_SEAT];
  if (ROLE === 'host') {
    guestPlayer = sim.players[OTHER_SEAT];
    feed.reset();
    // The guest's keys move its character (feed.js) while the guest is there.
    guestPlayer.external = menu.otherHere;
  }
  netRemoved = sim.players.map(() => []);
  netOpened = [];
  // Everybody else gets a character in their colour.
  for (const v of views) scene.remove(v.view.group);
  views = sim.players
    .filter((p) => p !== me)
    .map((p) => ({ seat: p.seat, view: new PlayerView(PALETTE[menu.colors[p.seat]].hex, calm, hall) }));
  for (const v of views) scene.add(v.view.group);
  dirtView.rebuild();
  film.reset();
  vacuum.setColor(PALETTE[menu.colors[MY_SEAT]].hex);
  controls.yaw = me.yaw;
  controls.pitch = 0;
  stride = 0;
  notice = '';
  state = 'countdown';
  lobby.show(false);
  hideResult();
  showTour(false);
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
  marker.hide();
  // First a flight through the hall, then the receipt (see frame()).
  tour.start();
}

// A new click or key press skips the camera tour (on this screen only). A
// key that is still held from the match repeats by itself; that does not count.
const skipTour = (e) => {
  if (!e.repeat && state === 'ended' && tour.running()) tour.skip();
};
canvas.addEventListener('mousedown', skipTour);
window.addEventListener('keydown', skipTour);

function toMenu() {
  state = 'menu';
  match.toMenu();
  controls.unlock();
  showHud(false);
  hideResult();
  showTour(false);
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
    feed.reset();
    if (inMatch()) {
      // The guest reloaded during a match: bring it back in, with the list
      // of all pieces that are gone already.
      guestPlayer.external = true;
      netRemoved = sim.players.map(() => []);
      netOpened = [];
      toGuest({ t: 'start', hostName: PARTY.name, colors: menu.colors, seed: match.seed });
      toGuest({ t: 'dirt', gone: packIds(dirt.gone()) });
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
  } else if (msg.t === 'input' && guestPlayer && inMatch()) {
    feed.push(msg.n, msg.s);
  }
}

function guestLeft() {
  guestConn = null;
  menu.otherHere = false;
  menu.ready = false;
  feed.reset();
  if (guestPlayer) {
    // Nobody steers the character any more: it stands still.
    const inp = guestPlayer.input;
    inp.f = inp.s = 0;
    inp.vac = false;
    guestPlayer.external = false;
  }
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
    // A guest who reloaded has not seen the menu: the name comes along here.
    menu.otherName = cleanName(msg.hostName);
    menu.otherHere = true;
    beginMatch(Number.isInteger(msg.seed) && msg.seed > 0 ? msg.seed : 1);
  } else if (msg.t === 'dirt' && inMatch()) {
    for (const id of match.onDirt(msg.gone)) dirtView.hide(id);
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

  // What the rules did in these steps: pieces of dirt fly into a nozzle.
  // ... or somebody opened the delivery box.
  const tellGuest = ROLE === 'host' && menu.otherHere;
  for (const e of sim.events) {
    if (e.type === 'suck') {
      dirtView.suck(e.id, e.seat);
      if (tellGuest) netRemoved[e.seat].push(e.id);
    } else if (e.type === 'back') {
      dirtView.show(e.id);
    } else if (e.type === 'open') {
      effects.burst(e.x, e.z);
      if (e.seat === MY_SEAT) announce(e.power);
      else toast(ROLE === 'solo' ? 'Bot' : menu.otherName, e.power);
      if (tellGuest) netOpened.push([e.seat, e.power, e.x, e.z]);
    }
  }
  sim.events.length = 0;
  // Where a nozzle is at work, the dust film is wiped off the floor.
  if (state === 'playing') {
    for (const p of sim.players) {
      if (!p.vacuuming) continue;
      const fx = -Math.sin(p.yaw);
      const fz = -Math.cos(p.yaw);
      // A row of soft circles along the nozzle's area (longer and wider with a power-up).
      const area = sim.nozzle(p);
      const r = area.width * 0.62;
      const last = Math.max(0.35, area.reach - r * 0.8);
      for (let ahead = 0.35; ; ahead = Math.min(last, ahead + r)) {
        film.wipe(p.x + fx * ahead, p.z + fz * ahead, r);
        if (ahead >= last) break;
      }
    }
  }
  const now = performance.now();
  if (ROLE === 'guest') {
    // The keys of the last steps go to the host.
    if (now - lastInput >= INPUT_MS) {
      lastInput = now;
      const msg = match.takeInputs();
      if (msg) toHost(msg);
    }
    return;
  }

  const over = match.state === 'ended';
  if (menu.otherHere && (over || now - lastSnap >= SNAP_MS)) {
    lastSnap = now;
    toGuest(match.snapshot(netRemoved, netOpened, feed.ack));
    netRemoved = sim.players.map(() => []);
    netOpened = [];
  }
  if (over) {
    toGuest({ t: 'end', sc: match.scores });
    endMatch(match.scores);
  }
}

/** The camera sits in the player's head and sways a little while walking. */
function firstPerson(dt) {
  // The rules move in steps of 1/60 s; the picture glides between the last two.
  const k = match.between;
  const x = me.px + (me.x - me.px) * k;
  const z = me.pz + (me.z - me.pz) * k;
  const speed = Math.hypot(me.vx, me.vz);
  stride += speed * dt;
  const sway = calm ? 0 : Math.sin(stride * 1.9) * 0.035 * Math.min(1, speed / CONFIG.move.walkSpeed);
  camera.position.set(x, CONFIG.move.eyeHeight + sway, z);
  camera.rotation.set(controls.pitch, controls.yaw, 0);
  vacuum.setPower(me.power);
  vacuum.update(dt, x, z, controls.yaw, stride, Math.min(1, speed / CONFIG.move.walkSpeed), me.vacuuming);
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
  } else if (state === 'ended' && tour.running()) {
    tour.update(dt);
    const total = dirt.count;
    const taken = total - dirt.left;
    showTour(true, taken / total, taken, total, Math.min(1, tour.progress() * 2.5));
  } else if (state === 'ended') {
    showTour(false);
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
      delivery: sim.delivery,
      power: me.power,
      powerT: me.powerT,
    });
    marker.update(camera, sim.delivery, me);
  }
  if (state !== 'menu') for (const v of views) v.view.update(dt, sim.players[v.seat]);
  dirtView.update(dt);
  effects.update(dt, sim.delivery, clock);

  // The own vacuum is only there while the player walks around.
  vacuum.show(inMatch());
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
