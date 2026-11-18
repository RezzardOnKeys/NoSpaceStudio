// Teleport Snipe – one player's screen: it ties everything together, reads
// the player's input, runs the frame loop and talks to the other player in
// a party match. Every browser runs this file. In a match alone and for the
// party host the referee (host.js) runs in the same browser; a party guest
// gets the state of the match over the network and shows it (guest.js).
//
// The files and what they do (the list grows while the game is built, the
// full plan is docs/TELEPORT-SNIPE.md):
//   config.js     every number that can be tuned
//   map.js        the temple garden as numbers (boxes, stairs, start points)
//   sim.js        the rules: moving, jumping, crouching, sliding, collisions,
//                 the reload, where a shot ends and the teleport after a miss
//   random.js     the seeded random numbers (teleport spots)
//   host.js       the referee (rounds, slow motion, score); the list of all
//                 party messages is at its top
//   bot.js        the bot you duel alone
//   feed.js       the guest's keys on the host, one step at a time
//   guest.js      the guest's copy of a party match (own player ahead,
//                 corrected softly)
//   wire.js       how players, keys and shots are packed for the network
//   net.js        party connection with PeerJS, ticker.js a clock for hidden tabs
//   scene.js      the 3D view (mapView.js the garden, playerView.js the
//                 other player, viewModel.js the own
//                 rifle, effects.js tracers, teleport flashes and petals)
//   controls.js   keyboard, mouse and the mouse speed slider
//   lobby.js      the menu before a match, hud.js the display during a match,
//                 the round card and the result
//   game.js       this file

import * as THREE from './vendor/three.module.js';
import { CONFIG, PALETTE, SNAP_MS, INPUT_MS, MAX_PLAYERS } from './config.js';
import { bodyHeight } from './sim.js';
import { PROPS } from './map.js';
import { createScene } from './scene.js';
import { buildMapView } from './mapView.js';
import { PlayerView } from './playerView.js';
import { createViewModel } from './viewModel.js';
import { createEffects, createPetalFall } from './effects.js';
import { createControls } from './controls.js';
import { createLobby } from './lobby.js';
import {
  showHud,
  setHudPlayers,
  updateHud,
  announce,
  showCard,
  hideCard,
  showResult,
  hideResult,
  onAgain,
} from './hud.js';
import { newSeed } from './random.js';
import { createReferee } from './host.js';
import { createMirror } from './guest.js';
import { createFeed } from './feed.js';
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
const rifle = createViewModel(calm);
const effects = createEffects(calm);
scene.add(effects.group);
// Cherry petals keep falling from the trees, also behind the menu.
const petals = createPetalFall(
  PROPS.filter((p) => p.type === 'tree'),
  calm,
);
scene.add(petals.group);
// The garden first, then the own rifle on top of it (its own depth).
renderer.autoClear = false;

// Who runs the match: the referee here, or a copy of the host's match.
// The party host moves the guest's player with the guest's keys (feed.js).
const feed = ROLE === 'host' ? createFeed() : null;
const match =
  ROLE === 'guest'
    ? createMirror({ mySeat: MY_SEAT })
    : createReferee({ localSeats: [MY_SEAT], feed, botSeats: ROLE === 'solo' ? [OTHER_SEAT] : [] });

// ---- State of this player's screen --------------------------------------
let state = 'menu'; // menu | countdown | playing | slowmo | card | ended
let other = null; // the other player's figure
let me = null; // the player's own body in the rules (sim.js)
let eyeY = 0; // the camera's height above the ground, smoothed
let eyeLift = CONFIG.look.eyeHeight; // eye height above the feet (lower when crouching)
let zoom = 0; // 0 = normal view, 1 = fully zoomed in
let kick = 0; // the recoil: how far the view is lifted right now (radians)
let hitT = 0; // seconds the hit marker is still shown
let dying = 0; // seconds since the player was hit (0 while alive)
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
let lastInput = 0;

// A match is running (the keys and the mouse belong to the game); after
// the last round the result is shown and the mouse is free again.
const inMatch = () => ['countdown', 'playing', 'slowmo', 'card'].includes(state);
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
    // A new number for every match: the teleport spots are different each time.
    const seed = newSeed();
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
const otherLabel = () => (ROLE === 'solo' ? 'Bot' : menu.otherName);

/** seed: the number all teleport spots of the match come from (the same on both screens). */
function beginMatch(seed) {
  match.start(seed);
  if (other) scene.remove(other.group);
  other = new PlayerView(PALETTE[menu.colors[OTHER_SEAT]].hex);
  scene.add(other.group);
  rifle.setColor(PALETTE[menu.colors[MY_SEAT]].hex);
  resetView();
  notice = '';
  state = match.state;
  hideCard();
  hideResult();
  lobby.show(false);
  showHud(true);
  setHudPlayers(
    PARTY ? PARTY.name : 'You',
    PALETTE[menu.colors[MY_SEAT]].hex,
    otherLabel(),
    PALETTE[menu.colors[OTHER_SEAT]].hex,
  );
}

/** The view starts at the own player, looking where the player looks. */
function resetView() {
  me = match.players[MY_SEAT];
  controls.yaw = me.yaw;
  controls.pitch = 0;
  eyeY = me.y;
  eyeLift = CONFIG.look.eyeHeight;
  zoom = 0;
  kick = 0;
  hitT = 0;
  dying = 0;
  if (other) {
    other.group.visible = true;
    other.group.rotation.x = 0;
  }
}

function toMenu() {
  state = 'menu';
  match.toMenu();
  controls.unlock();
  showHud(false);
  hideCard();
  hideResult();
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
    // From now on the guest's keys move the guest's player (from step 0 again).
    match.remoteSeat = OTHER_SEAT;
    feed.reset();
    if (state !== 'menu') {
      // The guest reloaded during a match: bring it back in. The next
      // snapshot tells it the round, the score and the countdown.
      toGuest({ t: 'start', hostName: PARTY.name, colors: menu.colors, seed: match.seed });
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
  } else if (msg.t === 'input' && msg.r === match.round && inMatch()) {
    feed.push(msg.n, msg.s);
  } else if (msg.t === 'shot') {
    match.remoteShot(OTHER_SEAT, msg);
  }
}

function guestLeft() {
  guestConn = null;
  menu.otherHere = false;
  menu.ready = false;
  // Nobody steers the guest's player any more: it stands still.
  match.remoteSeat = -1;
  feed.reset();
  const inp = match.players[OTHER_SEAT].input;
  inp.f = inp.s = 0;
  inp.jump = inp.crouch = inp.zoom = false;
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
    beginMatch(Number.isInteger(msg.seed) && msg.seed > 0 ? msg.seed : 1);
  } else if (msg.t === 'snap' && state !== 'menu') {
    const round = match.round;
    match.onSnap(msg);
    if (match.round !== round) resetView();
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

// ---- Input --------------------------------------------------------------------
/** Turns keyboard and mouse into the input of the player's body. */
function readInput(dt) {
  controls.turnWithKeys(dt);
  const k = (code) => (controls.down(code) ? 1 : 0);
  const inp = me.input;
  inp.f = k('KeyW') - k('KeyS');
  inp.s = k('KeyD') - k('KeyA');
  inp.yaw = controls.yaw;
  inp.jump = controls.down('Space');
  inp.crouch = controls.down('ShiftLeft') || controls.down('ShiftRight') || controls.down('KeyC');
  inp.zoom = controls.zooming();
}

// ---- The rifle ------------------------------------------------------------------
const TAN_FOV = Math.tan(THREE.MathUtils.degToRad(CONFIG.look.fov / 2));
const TAN_ZOOM = Math.tan(THREE.MathUtils.degToRad(CONFIG.rifle.zoomFov / 2));

/** Zooms in or out at the speed from config.js and sets the field of view. */
function updateZoom(dt) {
  const R = CONFIG.rifle;
  const want = inMatch() && controls.zooming() && dying === 0;
  zoom = want ? Math.min(1, zoom + dt / R.zoomIn) : Math.max(0, zoom - dt / R.zoomOut);
  // Zooming in the tangent of the angle feels even from start to end.
  const tanHalf = TAN_FOV + (TAN_ZOOM - TAN_FOV) * zoom;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanHalf));
  if (Math.abs(camera.fov - fov) > 0.001) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  // The mouse turns the view slower in the same measure as the picture grows.
  controls.zoomScale = tanHalf / TAN_FOV;
}

const aim = new THREE.Vector3();
const side = new THREE.Vector3();
const lift = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
const screen = new THREE.Vector2();
const ray = new THREE.Raycaster();
// A copy of the camera that never zooms: tracers start at the muzzle as it
// sits in the normal view, also when the player shoots zoomed in.
const aimCamera = new THREE.PerspectiveCamera(CONFIG.look.fov, 1, 0.08, 10);

/** A direction up to `degrees` off the crosshair, evenly spread over a circle. */
function spreadAim(degrees) {
  const euler = new THREE.Euler(controls.pitch, controls.yaw, 0, 'YXZ');
  aim.set(0, 0, -1).applyEuler(euler);
  if (degrees <= 0) return aim;
  side.set(1, 0, 0).applyEuler(euler);
  lift.set(0, 1, 0).applyEuler(euler);
  const off = Math.tan(THREE.MathUtils.degToRad(degrees) * Math.sqrt(Math.random()));
  const turn = Math.random() * Math.PI * 2;
  return aim.addScaledVector(side, Math.cos(turn) * off).addScaledVector(lift, Math.sin(turn) * off).normalize();
}

/** Pulls the trigger if the player pressed it: the shot hits at once. */
function shoot() {
  if (!controls.takeShot() || state !== 'playing') return;
  // Without zoom the shot goes somewhere around the crosshair; fully zoomed exactly on it.
  const dir = spreadAim(CONFIG.rifle.spread * (1 - zoom));
  const eye = camera.position;
  const out = match.shoot(MY_SEAT, { ox: eye.x, oy: eye.y, oz: eye.z, dx: dir.x, dy: dir.y, dz: dir.z });
  if (!out) return; // still reloading
  // A guest also sends the shot to the host, whose answer decides.
  if (out.message) toHost(out.message);
  const result = out.result;
  to.set(result.x, result.y, result.z);
  // The tracer starts at the muzzle as it is seen in the normal view.
  aimCamera.position.copy(camera.position);
  aimCamera.quaternion.copy(camera.quaternion);
  aimCamera.aspect = camera.aspect;
  aimCamera.updateProjectionMatrix();
  aimCamera.updateMatrixWorld();
  ray.setFromCamera(rifle.muzzleOnScreen(screen), aimCamera);
  from.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 0.7);
  const color = PALETTE[menu.colors[MY_SEAT]].hex;
  effects.tracer(from, to, color);
  effects.impact(to, result.target ? 0xffffff : color);
  if (result.target) hitT = CONFIG.rifle.hitMarkerTime;
  rifle.kick();
  if (!calm) kick += CONFIG.rifle.kick;
}

// ---- Rounds -------------------------------------------------------------------
/** Reacts when the match moves on: a hit, the round card, a new round, the end. */
function followMatch() {
  const now = match.state;
  if (now === state) return;
  state = now;
  const kill = match.kill;
  if (now === 'slowmo' && kill) {
    // The hit: the victim drops at once, the game runs slowly for a moment.
    if (kill.victim === MY_SEAT) {
      dying = 0.001;
      zoom = 0;
    }
  } else if (now === 'card' && kill) {
    // The victim vanishes in a puff of petals; the card shows the score.
    const v = match.players[kill.victim];
    effects.puff(v.x, v.y + 0.6, v.z);
    if (kill.victim === OTHER_SEAT && other) other.group.visible = false;
    showCard(match.round, kill.shooter === MY_SEAT, match.scores[MY_SEAT], match.scores[OTHER_SEAT]);
  } else if (now === 'countdown') {
    hideCard();
    resetView();
  } else if (now === 'ended') {
    hideCard();
    showHud(false);
    controls.unlock();
    showResult({
      won: match.scores[MY_SEAT] > match.scores[OTHER_SEAT],
      mine: match.scores[MY_SEAT],
      other: match.scores[OTHER_SEAT],
      canRestart: ROLE !== 'guest',
      note: ROLE === 'guest' ? 'Waiting for the host…' : '',
    });
  }
}

onAgain(() => {
  toMenu();
  sendLobby();
});

/** Teleports since the last frame: a flash where the player was and where they landed. */
function showEvents() {
  for (const e of match.events) {
    const color = PALETTE[menu.colors[e.seat]].hex;
    if (e.type === 'shot') {
      // The other player's shot (the own tracer is drawn in shoot()).
      if (e.seat !== MY_SEAT) {
        from.set(e.from.x, e.from.y - 0.15, e.from.z);
        to.set(e.to.x, e.to.y, e.to.z);
        effects.tracer(from, to, color);
        effects.impact(to, color);
      }
      continue;
    }
    effects.flash(e.from.x, e.from.y, e.from.z, color);
    effects.flash(e.to.x, e.to.y, e.to.z, color);
    if (e.seat === MY_SEAT) {
      announce('Teleported!');
      eyeY = me.y; // the camera jumps along at once
    }
  }
  match.events.length = 0;
}

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
  followMatch();
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
  if (ROLE !== 'host' || !menu.otherHere) return;
  if (now - lastSnap >= SNAP_MS) {
    lastSnap = now;
    toGuest(match.snapshot());
  }
}

/** The camera sits in the player's head. */
function firstPerson(dt) {
  const L = CONFIG.look;
  // The rules move in steps of 1/60 s; the picture glides between the last two.
  const k = match.between;
  const x = me.px + (me.x - me.px) * k;
  const y = me.py + (me.y - me.py) * k;
  const z = me.pz + (me.z - me.pz) * k;
  // On stairs the feet jump from step to step; the camera follows softly.
  // In the air it follows exactly, so jumps feel direct.
  if (me.grounded && Math.abs(y - eyeY) < 0.7) eyeY += (y - eyeY) * (1 - Math.exp(-L.stepSmooth * dt));
  else eyeY = y;
  const lift = me.crouching ? L.crouchEyeHeight : L.eyeHeight;
  eyeLift += (lift - eyeLift) * (1 - Math.exp(-L.crouchBlend * dt));
  // Never higher than the body allows (when standing up under a roof).
  camera.position.set(x, eyeY + Math.min(eyeLift, bodyHeight(me) - 0.1), z);
  // The recoil lifts the view for a moment; the aim itself does not move.
  kick *= Math.exp(-CONFIG.rifle.kickBack * dt);
  // When hit, the view sinks to the ground and tips to the side.
  let roll = 0;
  if (dying > 0) {
    dying += dt;
    const fall = Math.min(1, dying / 0.5);
    camera.position.y -= fall * (camera.position.y - eyeY - 0.3);
    roll = calm ? 0 : fall * 0.35;
  }
  camera.rotation.set(controls.pitch + kick, controls.yaw, roll);
  const speed = Math.min(1, Math.hypot(me.vx, me.vz) / CONFIG.move.runSpeed);
  // The own rifle is hidden while zoomed and after being hit.
  rifle.update(dt, me.grounded ? speed : 0, me.reload / CONFIG.rifle.reload, dying > 0 ? 1 : zoom);
}

/** The other player's figure stands where that player is, and drops when hit. */
function placeOther(dt) {
  const p = match.players[OTHER_SEAT];
  const k = match.between;
  other.place(p.px + (p.x - p.px) * k, p.py + (p.y - p.py) * k, p.pz + (p.z - p.pz) * k, p.yaw);
  other.tip(!p.alive, dt);
  other.crouch(p.crouching, dt);
}

/** Behind the menu the camera circles slowly over the garden. */
function menuCamera() {
  const a = calm ? 0.8 : clock * 0.05;
  // Radius and height keep the camera clear of the pagoda and the trees.
  camera.position.set(Math.cos(a) * 15, 8, Math.sin(a) * 15);
  camera.lookAt(Math.cos(a + 2.4) * 10, 1, Math.sin(a + 2.4) * 10);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = elapsed();
  advance(dt);
  updateZoom(dt);
  hitT = Math.max(0, hitT - dt);
  if (state === 'menu') {
    menuCamera();
  } else {
    // In slow motion everything in the garden moves at a quarter of its speed.
    const gameDt = dt * match.speed;
    firstPerson(dt);
    shoot();
    showEvents();
    placeOther(gameDt);
    updateHud({
      state,
      round: match.round,
      countdown: match.countdown,
      mine: match.scores[MY_SEAT],
      other: match.scores[OTHER_SEAT],
      locked: controls.locked(),
      notice,
      zoom,
      reload: me.reload / CONFIG.rifle.reload,
      hit: hitT / CONFIG.rifle.hitMarkerTime,
    });
  }
  // The tracer of the deciding shot stays visible through the slow motion.
  effects.update(dt * match.speed);
  petals.update(dt * match.speed);
  renderer.clear();
  renderer.render(scene, camera);
  if (inMatch()) {
    renderer.clearDepth();
    renderer.render(rifle.scene, rifle.camera);
  }
}
requestAnimationFrame(frame);
