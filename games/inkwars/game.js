// Inkwars – one player's screen: it ties everything together, reads the
// player's input, runs the frame loop and talks to the other player in a
// party match. Every browser runs this file. In a solo match and for the
// party host the referee (host.js) runs in the same browser; a party guest
// gets the state of the match over the network and shows it, moving only its
// own character ahead by itself (guest.js).
//
// The files and what they do:
//   config.js     numbers and rules that can be tuned
//   arena.js      the arena as numbers (boxes, ramps, heights)
//   paint.js      the colour mask: who painted what, and the score
//   sim.js        the rules: movement, shooting, water, hits
//   nav.js        path finding for bots, bots.js the bots
//   host.js       the referee; the list of all party messages is at its top
//   feed.js       the guest's keys on the host, one step at a time
//   guest.js      the guest's copy of a party match
//   wire.js       how characters and inputs are packed for the network
//   net.js        party connection with PeerJS, ticker.js a clock for hidden tabs
//   scene.js      the 3D view (arenaView.js, actorView.js, effects.js)
//   camera.js     where the camera is, controls.js keyboard and mouse
//   lobby.js      the menu before a match, hud.js the display during a match
//   game.js       this file

import * as THREE from './vendor/three.module.js';
import { PALETTE, SNAP_MS, INPUT_MS, STEP } from './config.js';
import { Arena } from './arena.js';
import { Paint } from './paint.js';
import { Sim } from './sim.js';
import { Nav } from './nav.js';
import { buildArenaView } from './arenaView.js';
import { ActorView } from './actorView.js';
import { Particles, ProjectileView } from './effects.js';
import { createScene } from './scene.js';
import { createControls } from './controls.js';
import { createCameraRig } from './camera.js';
import { createLobby } from './lobby.js';
import {
  setHudColors,
  showHud,
  updateHud,
  showResult,
  hideResult,
  onAgain,
  showKill,
} from './hud.js';
import { createReferee } from './host.js';
import { createFeed } from './feed.js';
import { createMirror } from './guest.js';
import { openRoom, joinRoom } from './net.js';

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username> in the address.
//  Without it the game was started alone: a solo match against bots.
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
// The host paints for team 1 (left base), the guest for team 2.
const MY_TEAM = ROLE === 'guest' ? 2 : 1;
const validColor = (v) => Number.isInteger(v) && v >= 0 && v < PALETTE.length;

// ---- The world ------------------------------------------------------------
const canvas = document.getElementById('game');
const { renderer, scene, camera } = createScene(canvas);
const arena = new Arena();
const paint = new Paint(arena);
const sim = new Sim(arena, paint);
scene.add(buildArenaView(arena, paint));

const teamColors = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
const projView = new ProjectileView(teamColors);
const particles = new Particles();
scene.add(projView.mesh, particles.mesh);
const rig = createCameraRig(camera, arena);

// Who runs the match: the referee here, or a copy of the host's match.
// The party host plays the guest's keys back one step at a time (feed.js).
const feed = createFeed();
const match =
  ROLE === 'guest'
    ? createMirror({ sim, paint })
    : createReferee({
        sim,
        paint,
        nav: new Nav(arena),
        beforeStep: () => {
          if (guestActor && guestActor.external) feed.play(guestActor, sim, STEP, sim.time + STEP);
        },
      });
if (ROLE === 'guest') {
  paint.readOnly = true;
  paint.useEarly(MY_TEAM);
  sim.authority = false;
}

// ---- State of this player's screen --------------------------------------
let state = 'menu'; // menu | countdown | playing | ended
let me = null; // the player's own character
let views = [];
let clock = 0;
let endT = 0; // seconds since the match ended
let finalPct = [0, 0]; // painted share at the end: [mine, opponent's]
let notice = ''; // a network notice shown during a match

// What the menu shows. colors holds the palette index of team 1 and team 2.
const menu = {
  teamSize: 1,
  colors: [0, 4],
  ready: false,
  otherName: 'Player',
  otherHere: false,
  status: '',
};

// Party connection
let toHost = () => {}; // guest: sends a message to the host
let guestConn = null; // host: the guest's connection
let guestActor = null; // host: the guest's character
let netEvents = []; // host: hits and deaths not sent yet
let lastSnap = 0;
let lastInput = 0;

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
      // Against bots the other colour follows; in a party the host goes first.
      if (ROLE === 'solo' || menu.colors[1] === i) menu.colors[1] = contrastTo(i);
      sendLobby();
    }
    renderLobby();
  },
  onTeamSize(n) {
    menu.teamSize = n === 2 ? 2 : 1;
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
      menu.teamSize = 1;
      menu.ready = false;
      toGuest({ t: 'start', colors: menu.colors });
    }
    beginMatch();
    controls.lock();
  },
});

function renderLobby() {
  lobby.render({
    teamSize: menu.teamSize,
    myColor: menu.colors[MY_TEAM - 1],
    otherColor: menu.colors[2 - MY_TEAM],
    myName: PARTY ? PARTY.name : 'You',
    otherName: menu.otherName,
    otherHere: menu.otherHere,
    ready: menu.ready,
    status: menu.status,
  });
}

// ---- Match ------------------------------------------------------------------
function beginMatch() {
  const hex = menu.colors.map((i) => PALETTE[i].hex);
  teamColors[1].set(hex[0]);
  teamColors[2].set(hex[1]);
  paint.setColors(hex[0], hex[1]);

  if (ROLE === 'guest') {
    match.start(1);
    me = sim.actors.find((a) => a.team === MY_TEAM && a.slot === 0);
  } else {
    const seats =
      ROLE === 'host'
        ? [
            [1, 0],
            [2, 0],
          ]
        : [[1, 0]];
    [me, guestActor = null] = match.start(menu.teamSize, seats);
    feed.reset();
    // The guest's keys move its character (feed.js) while the guest is there.
    if (guestActor) guestActor.external = menu.otherHere;
    // The party host remembers where everybody was, to judge the guest's
    // shots against what the guest saw (Sim.poseAt).
    sim.history = ROLE === 'host' ? new Map() : null;
  }

  for (const v of views) scene.remove(v.group);
  views = sim.actors.map((a) => new ActorView(a, hex[a.team - 1], hex[2 - a.team]));
  for (const v of views) scene.add(v.group);

  controls.yaw = me.yaw;
  controls.pitch = -0.1;
  rig.reset(me);
  notice = '';
  netEvents = [];
  state = 'countdown';

  lobby.show(false);
  hideResult();
  showHud(true);
  setHudColors(hex[MY_TEAM - 1], hex[2 - MY_TEAM]);
}

/** pct: painted share of team 1 and team 2 in percent. */
function endMatch(pct) {
  state = 'ended';
  endT = 0;
  finalPct = [pct[MY_TEAM - 1], pct[2 - MY_TEAM]];
  sim.projectiles = [];
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
const target = new THREE.Vector3();
const muzzle = new THREE.Vector3();

/** Turns keyboard and mouse into the input object of the player's character. */
function readInput(dt) {
  controls.turnWithKeys(dt);
  const { yaw, pitch } = controls;
  const k = (code) => (controls.down(code) ? 1 : 0);
  const f = k('KeyW') - k('KeyS');
  const s = k('KeyD') - k('KeyA');
  const inp = me.input;
  inp.moveX = -Math.sin(yaw) * f + Math.cos(yaw) * s;
  inp.moveZ = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  inp.jump = controls.down('Space');
  inp.fish = controls.down('ShiftLeft') || controls.down('ShiftRight');
  inp.shoot = controls.mouseDown || controls.down('KeyE');

  // Aim: from the gun at the spot the crosshair points at. The camera looks
  // over the right shoulder, so the gun turns in a little towards that spot.
  // The gun's place depends on the direction, so it is worked out a few
  // times; each time it gets closer (matters right in front of a wall).
  rig.aimPoint(yaw, pitch, target);
  inp.lookYaw = yaw;
  inp.aimYaw = yaw;
  for (let i = 0; i < 5; i++) {
    const angles = Sim.aimAngles(sim.muzzle(me, muzzle), target);
    inp.aimYaw = angles.yaw;
    inp.aimPitch = angles.pitch;
  }
}

/**
 * A character went out at (x, y, z); team is the side whose water did it.
 * A big burst of that water, and a message if it was the player's side.
 */
function soaked(x, y, z, team) {
  particles.burst(x, y, z, teamColors[team], 90, 8);
  if (team === MY_TEAM) showKill('Opponent soaked!');
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
    // From now on every splat and water drop is written down for the guest.
    paint.log = [];
    sim.shots = [];
    netEvents = [];
    notice = '';
    feed.reset();
    if (guestActor) guestActor.external = true;
    if (inMatch()) {
      // The guest reloaded during a match: bring it back in.
      toGuest({ t: 'start', colors: menu.colors });
      toGuest({ t: 'paint', mask: paint.exportState() });
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
  } else if (msg.t === 'input' && guestActor && inMatch()) {
    feed.push(msg.n, msg.s);
  }
}

function guestLeft() {
  guestConn = null;
  menu.otherHere = false;
  menu.ready = false;
  paint.log = null;
  sim.shots = null;
  feed.reset();
  if (guestActor) {
    // Nobody steers the character any more: it stands still.
    const inp = guestActor.input;
    inp.moveX = inp.moveZ = 0;
    inp.shoot = inp.jump = inp.fish = false;
    guestActor.rewind = 0;
    guestActor.external = false; // the rules move it again (falling, coming back in)
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
    beginMatch();
  } else if (msg.t === 'paint' && inMatch()) {
    if (msg.mask instanceof ArrayBuffer || ArrayBuffer.isView(msg.mask)) {
      paint.importState(msg.mask instanceof ArrayBuffer ? msg.mask : msg.mask.buffer);
    }
  } else if (msg.t === 'snap' && inMatch()) {
    for (const e of match.onSnap(msg, me)) {
      const team = e[4] === 2 ? 2 : 1;
      if (e[0] === 0) particles.burst(e[1], e[2], e[3], teamColors[team], 8, 4);
      else soaked(e[1], e[2], e[3], team);
    }
  } else if (msg.t === 'end' && inMatch()) {
    const pct = Array.isArray(msg.pct) ? msg.pct.map((v) => (Number.isFinite(v) ? v : 0)) : [0, 0];
    endMatch([pct[0] || 0, pct[1] || 0]);
  }
}

if (ROLE === 'host') {
  menu.colors[1] = contrastTo(menu.colors[0]);
  openRoom(PARTY.code, {
    onJoin(conn) {
      if (guestConn) {
        // Inkwars is 1 vs 1: there is no seat for a third player.
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

/** Moves the match on: input, rules (or the copy of them), network. */
function advance(dt) {
  clock += dt;
  const now = performance.now();
  if (me && inMatch()) readInput(dt);

  if (ROLE === 'guest') {
    match.update(dt, me);
    if (state === 'countdown' && match.state === 'playing') state = 'playing';
    if (inMatch() && now - lastInput >= INPUT_MS) {
      lastInput = now;
      const msg = match.takeInputs();
      if (msg) toHost(msg);
    }
  } else if (inMatch()) {
    match.step(dt);
    if (state === 'countdown' && match.state === 'playing') state = 'playing';
  }

  for (const e of sim.events) {
    const c = teamColors[e.team];
    if (e.type === 'splash') particles.burst(e.x, e.y, e.z, c, 4, 3);
    else if (e.type === 'hit') particles.burst(e.x, e.y, e.z, c, 8, 4);
    else soaked(e.x, e.y, e.z, e.team);
    if (menu.otherHere && ROLE === 'host' && e.type !== 'splash') {
      netEvents.push([e.type === 'hit' ? 0 : 1, e.x, e.y, e.z, e.team]);
    }
  }
  sim.events.length = 0;

  if (ROLE === 'guest') return;
  const over = state === 'playing' && match.state === 'ended';
  if (menu.otherHere && inMatch() && (over || now - lastSnap >= SNAP_MS)) {
    lastSnap = now;
    toGuest({ ...match.snapshot(netEvents.splice(0)), k: feed.ack });
  }
  if (over) {
    const pct = [paint.percent(1), paint.percent(2)];
    toGuest({ t: 'end', pct });
    endMatch(pct);
  }
}

function frame() {
  requestAnimationFrame(frame);
  const dt = elapsed();
  advance(dt);

  for (const v of views) v.update(dt, MY_TEAM);
  projView.update(sim.projectiles);
  particles.update(dt);

  if (state === 'menu') {
    rig.orbit(clock);
  } else if (state === 'ended') {
    endT += dt;
    rig.topDown(dt);
    if (endT > 1.6) {
      const note = ROLE === 'guest' ? 'Waiting for the host…' : '';
      showResult(finalPct[0], finalPct[1], Math.min(1, (endT - 1.6) / 2), ROLE !== 'guest', note);
    }
  } else if (me) {
    rig.follow(me, controls.yaw, controls.pitch, dt);
    updateHud({
      state,
      timeLeft: match.timeLeft,
      countdown: match.countdown,
      me,
      minePct: paint.percent(MY_TEAM),
      otherPct: paint.percent(3 - MY_TEAM),
      locked: controls.locked(),
      notice,
    });
  }

  paint.flush();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
