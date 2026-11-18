// Millpond – one player's screen: it ties everything together, reads the
// clicks on the board, runs the frame loop and talks to the other player in
// a party game. Every browser runs this file. Alone, the rules (rules.js)
// and the computer (ai.js) run right here. In a party the host's browser
// holds the one true game (host.js); the guest's browser keeps a copy
// (guest.js) that shows its own moves at once and follows the host.
//
// The files and what they do:
//   config.js      numbers that can be tuned, names of the sides
//   rules.js       the rules: board, phases, mills, removing, flying, results, draws
//   host.js        the referee of a party game; the list of all party messages is at its top
//   guest.js       the guest's copy of a party game
//   ai.js          the computer opponent
//   net.js         party connection with PeerJS
//   scene.js       the 3D view and its light; world.js the island, the pond,
//                  the water mill and the land round it; koi.js the fish
//   board.js       the points of the board, marks, what is under the mouse
//   pieces.js      the ladybug and snail figures; pieceView.js puts them in
//                  their rows and on the board and lets them hop, walk, fly,
//                  glow in a mill, fly away and slide into the pond
//   camera.js      turning and zooming the camera
//   menu.js        the menu before a game, hud.js everything on top of the
//                  view during a game and the result
//   game.js        this file
//   vendor/        three.js (with OrbitControls) and PeerJS, each with its licence

import { CONFIG, SIDE_NAMES, PIECE_NAME } from './config.js';
import { createRules, other, unpackMove } from './rules.js';
import { createReferee } from './host.js';
import { createCopy, cleanName } from './guest.js';
import { bestMove } from './ai.js';
import { openRoom, joinRoom } from './net.js';
import { createScene } from './scene.js';
import { createBoard } from './board.js';
import { createPieceView } from './pieceView.js';
import { createCameraRig } from './camera.js';
import { createMenu } from './menu.js';
import { createHud, describeResult } from './hud.js';

// ---------------------------------------------------------------------
//  NoSpaceStudio launcher integration
//  The launcher starts the game for a party with
//  #party=<code>&role=host|guest&name=<username> in the address.
//  Without it the game was started alone: a game against the computer.
//  Details: docs/PARTY-GAMES.md in the NoSpaceStudio repository.
// ---------------------------------------------------------------------
const PARTY = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const code = (h.get('party') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const role = h.get('role');
  if (!code || (role !== 'host' && role !== 'guest')) return null;
  return { code, role, name: cleanName(h.get('name')) };
})();
const ROLE = PARTY ? PARTY.role : 'solo'; // solo | host | guest
const LEVEL_NAMES = { 1: 'easy', 2: 'medium', 3: 'hard' };
// Players who asked their system for less motion get no swinging camera.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- The world ------------------------------------------------------------
const canvas = document.getElementById('c');
const view = createScene(canvas, calm);
const board = createBoard(view.scene, calm);
const pieces = createPieceView(view.scene, { calm, world: view.world, koi: view.koi });
const rig = createCameraRig(view.camera, canvas, calm);
const hud = createHud();

// ---- The game: alone, as the referee, or as the guest's copy ---------------
const ref = ROLE === 'host' ? createReferee() : null;
const copy = ROLE === 'guest' ? createCopy() : null;
const rules = ref ? ref.rules : copy ? copy.rules : createRules();
const solo = { state: 'menu', mySide: 'l', result: null };

/** menu | playing | ended */
const phase = () => (ref || copy || solo).state;
const result = () => (ref || copy || solo).result;
const mySide = () => (ref ? ref.hostSide : copy ? copy.mySide : solo.mySide);

const menu = {
  side: 'l', // what the host or the player alone plays: l | s | r (random)
  level: 2,
  myName: PARTY ? PARTY.name : 'You',
  otherName: ROLE === 'solo' ? 'Computer' : '…',
  otherHere: false,
  ready: false,
  status: '',
};

let screen = 'menu'; // menu | game
let selected = null; // the point of the chosen piece (moving and flying)
let resultShown = false; // the result card was shown for this game
let confirmUntil = 0; // "Really resign?" until this time
let thinking = false; // the computer is looking for a move
let aiToken = 0; // a new game makes the computer's answer void

const names = () => {
  const me = mySide();
  const mine = ROLE === 'solo' ? 'You' : menu.myName;
  const theirs = ROLE === 'solo' ? 'The computer' : menu.otherName;
  return { [me]: mine, [other(me)]: theirs };
};

// ---- The party connection ---------------------------------------------------
let toGuest = () => {};
let toHost = () => {};
let guestConn = null;
const SAVE_KEY = PARTY ? 'millpond-host-' + PARTY.code : '';

/** The host keeps the game in the tab's session, so a reload continues it. */
function saveHost() {
  try {
    if (ref.state === 'menu') sessionStorage.removeItem(SAVE_KEY);
    else sessionStorage.setItem(SAVE_KEY, JSON.stringify(ref.save()));
  } catch {
    /* without storage a reload of the host starts in the menu */
  }
}

function sendLobby() {
  toGuest({ t: 'lobby', hostName: menu.myName, side: menu.side, ready: menu.ready });
}

/** Sends a finished game's result to the guest. */
function sendEnd() {
  if (ref.result) toGuest({ t: 'end', r: ref.result });
}

function fromGuest(msg) {
  if (msg.t === 'hello') {
    menu.otherName = cleanName(msg.name);
    menu.otherHere = true;
    menu.ready = false;
    hud.toast('');
    if (ref.state === 'menu') sendLobby();
    else toGuest(ref.gameMessage(menu.myName));
  } else if (msg.t === 'ready' && ref.state === 'menu') {
    menu.ready = !!msg.ready;
  } else if (msg.t === 'move') {
    const ok = ref.guestMove(msg);
    if (ok) {
      pieces.play(ok.done);
      toGuest(ok.msg);
      sendEnd();
      saveHost();
    } else {
      toGuest(ref.gameMessage(menu.myName));
    }
  } else if (msg.t === 'resign') {
    if (ref.resign(ref.guestSide)) {
      sendEnd();
      saveHost();
    }
  } else if (msg.t === 'sync') {
    toGuest(ref.gameMessage(menu.myName));
  }
  refresh();
}

function guestLeft() {
  guestConn = null;
  toGuest = () => {};
  menu.otherHere = false;
  menu.ready = false;
  if (screen === 'game') hud.toast(`${menu.otherName} left the game. Waiting for them to come back…`, true);
  refresh();
}

function fromHost(msg) {
  if (msg.t === 'lobby') {
    menu.side = ['l', 's', 'r'].includes(msg.side) ? msg.side : 'l';
    menu.otherName = cleanName(msg.hostName);
    menu.otherHere = true;
    menu.ready = !!msg.ready;
    if (screen === 'game') {
      copy.toMenu();
      showMenu();
    }
  } else if (msg.t === 'game') {
    if (copy.onGame(msg)) {
      menu.otherName = copy.hostName;
      menu.otherHere = true;
      enterGame();
    }
  } else if (msg.t === 'move') {
    const r = copy.onMove(msg);
    if (r === 'resync') toHost({ t: 'sync' });
    else if (r !== 'known') pieces.play(r.done);
  } else if (msg.t === 'end') {
    copy.onEnd(msg);
  }
  refresh();
}

if (ROLE === 'host') {
  openRoom(PARTY.code, {
    onJoin(conn) {
      if (guestConn) {
        // Millpond is 1 vs 1: there is no seat for a third player.
        conn.send({ t: 'full' });
        conn.close();
        return { onMessage() {}, onLeave() {} };
      }
      guestConn = conn;
      toGuest = conn.send;
      return { onMessage: fromGuest, onLeave: guestLeft };
    },
    onStatus(text) {
      menu.status = text;
      refresh();
    },
  });
} else if (ROLE === 'guest') {
  joinRoom(PARTY.code, {
    onOpen(send) {
      toHost = send;
      send({ t: 'hello', name: PARTY.name });
    },
    onMessage: fromHost,
    onStatus(text) {
      menu.status = text;
      if (text) {
        // The connection is gone: wait in the menu until the host is back.
        menu.otherHere = false;
        menu.ready = false;
        toHost = () => {};
        if (screen === 'game') {
          copy.toMenu();
          showMenu();
        }
      }
      refresh();
    },
  });
}

// ---- The computer (alone) ------------------------------------------------------
function maybeComputer() {
  if (ROLE !== 'solo' || solo.state !== 'playing' || rules.turn === solo.mySide) return;
  thinking = true;
  const id = ++aiToken;
  setTimeout(() => {
    if (id !== aiToken) return;
    computerAnswer({ ...bestMove(rules.packed(), menu.level), id });
  }, CONFIG.ai.minThinkMs);
}

function computerAnswer(data) {
  if (data.id !== aiToken || !thinking) return;
  thinking = false;
  const done = data.move && rules.move(data.move);
  if (done) {
    pieces.play(done);
    soloCheckEnd();
    // After closing a mill the computer removes a piece as its next move.
    maybeComputer();
  }
  refresh();
}

function soloCheckEnd() {
  const r = rules.outcome();
  if (r) {
    solo.result = r;
    solo.state = 'ended';
  }
}

// ---- Starting, ending, the menu -------------------------------------------------
const pickSide = (side) => (side === 'r' ? (Math.random() < 0.5 ? 'l' : 's') : side);

function startSolo() {
  aiToken++;
  thinking = false;
  solo.mySide = pickSide(menu.side);
  solo.result = null;
  solo.state = 'playing';
  rules.reset();
  enterGame();
  maybeComputer();
}

function startHost(side) {
  ref.start(side);
  enterGame();
  toGuest(ref.gameMessage(menu.myName));
  saveHost();
}

/** Shows the board for the game that is now in the rules (new, continued or rejoined). */
function enterGame() {
  screen = 'game';
  selected = null;
  resultShown = false;
  confirmUntil = 0;
  pieces.reset(rules);
  rig.viewSide(mySide());
  menuUi.show(false);
  hud.hideResult();
  hud.show(true);
  rig.setAutoRotate(false);
}

function showMenu() {
  screen = 'menu';
  selected = null;
  hud.hideResult();
  hud.show(false);
  hud.toast('');
  menuUi.show(true);
  rig.setAutoRotate(true);
}

function backToMenu() {
  if (ROLE === 'solo') {
    aiToken++;
    thinking = false;
    solo.state = 'menu';
  } else if (ROLE === 'host') {
    ref.toMenu();
    menu.ready = false;
    saveHost();
    sendLobby();
  }
  showMenu();
  refresh();
}

function showResultCard() {
  const r = result();
  if (!r) return;
  const { title, text, mood } = describeResult(r, mySide(), names());
  hud.showResult({
    title,
    text,
    mood,
    again: ROLE === 'solo' ? 'Play again' : ROLE === 'host' ? 'Rematch (swap sides)' : '',
    menu: ROLE !== 'guest',
    note: ROLE === 'guest' ? 'Waiting for the host…' : '',
  });
}

const menuUi = createMenu({
  role: ROLE,
  onSide(side) {
    menu.side = side;
    if (ROLE === 'host') sendLobby();
    refresh();
  },
  onLevel(level) {
    menu.level = level;
    refresh();
  },
  onMain() {
    if (ROLE === 'solo') startSolo();
    else if (ROLE === 'host') {
      if (menu.otherHere && menu.ready) startHost(pickSide(menu.side));
    } else {
      menu.ready = !menu.ready;
      toHost({ t: 'ready', ready: menu.ready });
    }
    refresh();
  },
});

document.getElementById('again').onclick = () => {
  if (ROLE === 'solo') startSolo();
  else if (ROLE === 'host') startHost(ref.guestSide);
  refresh();
};
document.getElementById('toMenu').onclick = backToMenu;
document.getElementById('look').onclick = () => hud.hideResult();

// ---- Playing a move -----------------------------------------------------------
const canMove = () =>
  screen === 'game' && phase() === 'playing' && rules.turn === mySide() && !thinking && !pieces.busy();

function play(m) {
  if (ROLE === 'solo') {
    const done = rules.move(m);
    if (!done) return;
    pieces.play(done);
    soloCheckEnd();
    maybeComputer();
  } else if (ROLE === 'host') {
    const ok = ref.hostMove(m);
    if (!ok) return;
    pieces.play(ok.done);
    toGuest(ok.msg);
    sendEnd();
    saveHost();
  } else {
    const ok = copy.tryMove(m);
    if (!ok) return;
    pieces.play(ok.done);
    toHost(ok.msg);
  }
}

/** A click on point p of the board. */
function onPoint(p) {
  if (!canMove()) return;
  const now = rules.phase;
  if (now === 'place') {
    if (!rules.board()[p]) play({ k: 'p', to: p });
  } else if (now === 'remove') {
    if (rules.removable().includes(p)) play({ k: 'x', at: p });
  } else if (selected !== null && rules.targetsFrom(selected).includes(p)) {
    const from = selected;
    selected = null;
    play({ k: 'm', from, to: p });
  } else if (rules.board()[p] === mySide() && p !== selected) {
    selected = p;
  } else {
    selected = null;
  }
  refresh();
}

function resign() {
  if (phase() === 'ended') {
    showResultCard();
    return;
  }
  if (phase() !== 'playing') return;
  if (performance.now() > confirmUntil) {
    confirmUntil = performance.now() + CONFIG.resignConfirmMs;
    refresh();
    setTimeout(refresh, CONFIG.resignConfirmMs + 50);
    return;
  }
  confirmUntil = 0;
  if (ROLE === 'solo') {
    aiToken++;
    thinking = false;
    solo.result = { w: other(solo.mySide), why: 'resign' };
    solo.state = 'ended';
  } else if (ROLE === 'host') {
    if (ref.resign(ref.hostSide)) {
      sendEnd();
      saveHost();
    }
  } else {
    toHost({ t: 'resign' });
  }
  refresh();
}

document.getElementById('resign').onclick = resign;
document.getElementById('cam').onclick = () => rig.viewSide(mySide());
window.addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.toLowerCase() === 'c' && screen === 'game') rig.viewSide(mySide());
});

// ---- Mouse and touch on the board ------------------------------------------------
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, button: e.button };
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || down.button !== 0) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6 || screen !== 'game') return;
  const p = board.pick(e.clientX, e.clientY, view.camera, pieces.pickable());
  if (p !== null) onPoint(p);
});
canvas.addEventListener('pointermove', (e) => {
  if (screen !== 'game' || e.pointerType !== 'mouse' || down) return;
  const p = board.pick(e.clientX, e.clientY, view.camera, pieces.pickable());
  canvas.style.cursor = p !== null && canMove() ? 'pointer' : '';
});

// ---- What the screen shows -----------------------------------------------------------
function statusText() {
  const r = result();
  if (r) return describeResult(r, mySide(), names()).title;
  const now = rules.phase;
  if (rules.turn === mySide()) {
    if (now === 'place') return `Place a piece – ${rules.hand(mySide())} left`;
    if (now === 'remove') return `Remove a ${PIECE_NAME[other(mySide())]}!`;
    if (now === 'fly') return 'Fly a piece to any free point';
    return 'Move a piece';
  }
  if (ROLE === 'solo') return 'The computer is thinking…';
  return now === 'remove' ? `${menu.otherName} removes a piece…` : `${menu.otherName} to move`;
}

/** The points of the last move that set or moved a piece. */
function lastPoints() {
  const list = rules.packed();
  for (let i = list.length - 1; i >= 0; i--) {
    const m = unpackMove(list[i]);
    if (m.k === 'p') return [m.to];
    if (m.k === 'm') return [m.from, m.to];
  }
  return [];
}

function refresh() {
  menuUi.render(menu);
  if (screen !== 'game') return;
  // A safety net: if the picture ever shows something else than the rules, set it anew.
  if (!pieces.busy() && !pieces.matches(rules)) pieces.reset(rules);
  const mine = canMove();
  if (!mine || (rules.phase !== 'move' && rules.phase !== 'fly')) selected = null;
  const now = rules.phase;
  const free = [];
  if (mine && now === 'place') for (let p = 0; p < 24; p++) if (!rules.board()[p]) free.push(p);
  pieces.setSelected(selected);
  board.show({
    free,
    targets: mine && selected !== null ? rules.targetsFrom(selected) : [],
    selected,
    removable: mine && now === 'remove' ? rules.removable() : [],
    last: lastPoints(),
  });
  hud.setStatus(statusText(), mine);
  const me = mySide();
  const opponent =
    ROLE === 'solo'
      ? `Computer (${LEVEL_NAMES[menu.level]})`
      : menu.otherHere || ROLE === 'guest'
        ? menu.otherName
        : `${menu.otherName} (away)`;
  const line = (side, name) => ({ name, side, hand: rules.hand(side), onBoard: rules.onBoard(side) });
  hud.setPlayers(
    [line(me, ROLE === 'solo' ? `You (${SIDE_NAMES[me]})` : `${menu.myName} (you)`), line(other(me), opponent)],
    result() ? null : rules.turn,
  );
  const ended = phase() === 'ended';
  hud.setButtons({
    resign: ended ? 'result' : performance.now() < confirmUntil ? 'confirm' : 'resign',
    resignEnabled: ended || phase() === 'playing',
  });
}

// ---- Main loop ----------------------------------------------------------------
let last = performance.now();
let clock = 0;
let wasBusy = false;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  rig.update(dt);
  view.update(clock, dt);
  pieces.update(dt, clock);
  board.update(clock);

  // When the last move has been shown, the board wakes up and the result shows.
  const busy = pieces.busy();
  if (wasBusy && !busy) refresh();
  wasBusy = busy;
  if (screen === 'game' && phase() === 'ended' && !resultShown && !busy) {
    resultShown = true;
    showResultCard();
  }
  view.renderer.render(view.scene, view.camera);
}

// A host who reloads continues the running game.
if (ROLE === 'host') {
  try {
    if (ref.restore(JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null'))) enterGame();
  } catch {
    /* nothing saved, or storage is blocked: start in the menu */
  }
}
if (screen === 'menu') showMenu();
refresh();
requestAnimationFrame(frame);
