// Blockchess – one player's screen: it ties everything together, reads the
// clicks on the board, runs the frame loop and talks to the other player in
// a party game. Every browser runs this file. Alone, the rules (rules.js)
// and the computer (ai.js) run right here. In a party the host's browser
// holds the one true game (host.js); the guest's browser keeps a copy
// (guest.js) that shows its own moves at once and follows the host.
//
// The files and what they do:
//   config.js      numbers that can be tuned, names of the sides
//   rules.js       the rules of chess (around chess.js), results, move texts
//   host.js        the referee of a party game; the list of all party messages is at its top
//   guest.js       the guest's copy of a party game
//   ai.js          the computer opponent; aiWorker.js runs it in a web worker
//   net.js         party connection with PeerJS
//   scene.js       the 3D view, light and day/night; world.js the block island,
//                  textures.js the pixel textures painted at the start
//   board.js       squares, marks on the board, what is under the mouse
//   pieces.js      the twelve block figures; pieceView.js puts them on the
//                  board and lets them walk, jump, vanish and stand aside
//   camera.js      turning, zooming and flying the camera
//   menu.js        the menu before a game, hud.js everything on top of the
//                  view during a game and the result
//   game.js        this file
//   vendor/        three.js (with OrbitControls), chess.js and PeerJS, each
//                  with its licence

import { CONFIG, SIDE_NAMES } from './config.js';
import { createRules, validResult } from './rules.js';
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
const other = (color) => (color === 'w' ? 'b' : 'w');
const LEVEL_NAMES = { 1: 'easy', 2: 'medium', 3: 'hard' };
// Players who asked their system for less motion get no bobbing, hopping or swinging.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- The world ------------------------------------------------------------
const canvas = document.getElementById('c');
const view = createScene(canvas);
const board = createBoard(view.scene);
const pieces = createPieceView(view.scene, calm);
const rig = createCameraRig(view.camera, canvas, calm);
const hud = createHud();

// ---- The game: alone, as the referee, or as the guest's copy ---------------
const ref = ROLE === 'host' ? createReferee() : null;
const copy = ROLE === 'guest' ? createCopy() : null;
const rules = ref ? ref.rules : copy ? copy.rules : createRules();
const solo = { state: 'menu', myColor: 'w', result: null };

/** menu | playing | ended */
const phase = () => (ref || copy || solo).state;
const result = () => (ref || copy || solo).result;
const myColor = () => (ref ? ref.hostColor : copy ? copy.myColor : solo.myColor);

const menu = {
  side: 'w', // what the host or the player alone plays: w | b | r (random)
  level: 2,
  myName: PARTY ? PARTY.name : 'You',
  otherName: ROLE === 'solo' ? 'Computer' : '…',
  otherHere: false,
  ready: false,
  status: '',
};

let screen = 'menu'; // menu | game
let selected = null; // the square of the selected piece
let targets = []; // the moves of the selected piece
let promoToken = 0; // a new game makes an open promotion choice void
let resultShown = false; // the result card was shown for this game
let confirmUntil = 0; // "Really resign?" until this time
let thinking = false; // the computer is looking for a move
let aiToken = 0; // a new game or undo makes the computer's answer void

const names = () => {
  const me = myColor();
  const mine = ROLE === 'solo' ? 'You' : menu.myName;
  const theirs = ROLE === 'solo' ? 'The computer' : menu.otherName;
  return { [me]: mine, [other(me)]: theirs };
};

// ---- The party connection ---------------------------------------------------
let toGuest = () => {};
let toHost = () => {};
let guestConn = null;
const SAVE_KEY = PARTY ? 'blockchess-host-' + PARTY.code : '';

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
    const done = ref.guestMove(msg);
    if (done) {
      pieces.play(done.mv);
      toGuest(done.msg);
      sendEnd();
      saveHost();
    } else {
      toGuest(ref.gameMessage(menu.myName));
    }
  } else if (msg.t === 'resign') {
    if (ref.resign(ref.guestColor)) {
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
    menu.side = ['w', 'b', 'r'].includes(msg.side) ? msg.side : 'w';
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
    else if (r !== 'known') pieces.play(r.mv);
  } else if (msg.t === 'end') {
    copy.onEnd(msg);
  }
  refresh();
}

if (ROLE === 'host') {
  openRoom(PARTY.code, {
    onJoin(conn) {
      if (guestConn) {
        // Chess is 1 vs 1: there is no seat for a third player.
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
let worker = null;
try {
  worker = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => computerAnswer(e.data);
  worker.onerror = () => {
    // Without the worker the computer thinks on the page itself (the picture
    // stands still for a moment).
    worker = null;
    if (thinking) askComputer();
  };
} catch {
  worker = null;
}

function askComputer() {
  const id = aiToken;
  const job = { fen: rules.fen(), level: menu.level, id };
  setTimeout(() => {
    if (id !== aiToken) return;
    if (worker) worker.postMessage(job);
    else computerAnswer({ ...bestMove(job.fen, job.level), id });
  }, CONFIG.ai.minThinkMs);
}

function maybeComputer() {
  if (ROLE !== 'solo' || solo.state !== 'playing' || rules.turn === solo.myColor) return;
  thinking = true;
  aiToken++;
  askComputer();
}

function computerAnswer(data) {
  if (data.id !== aiToken || !thinking) return;
  thinking = false;
  const mv = data.move && rules.move(data.move);
  if (mv) {
    pieces.play(mv);
    soloCheckEnd();
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

// ---- When the browser switches the 3D view off --------------------------------------
// Some graphics chips give up now and then (too much work, a driver hiccup);
// the browser then drops the 3D view and only the blue page background
// stays. three.js asks the browser to bring it back; if that does not
// happen within a few seconds, a notice offers to reload the page. A game
// alone is kept over that reload (the party host keeps its game anyway, and
// a guest comes back into the running game by itself).
const RELOAD_KEY = 'blockchess-reload';
let lostTimer = 0;
canvas.addEventListener('webglcontextlost', () => {
  clearTimeout(lostTimer);
  lostTimer = setTimeout(() => document.getElementById('lost').classList.remove('hidden'), CONFIG.lostWaitMs);
});
canvas.addEventListener('webglcontextrestored', () => {
  clearTimeout(lostTimer);
  document.getElementById('lost').classList.add('hidden');
});
document.getElementById('reload').onclick = () => {
  if (ROLE === 'solo' && solo.state !== 'menu') {
    try {
      sessionStorage.setItem(
        RELOAD_KEY,
        JSON.stringify({ mv: rules.packed(), me: solo.myColor, level: menu.level, r: solo.result }),
      );
    } catch {
      /* without storage the reload starts in the menu */
    }
  }
  location.reload();
};

/** After "Reload" in that notice, the game alone goes on where it was. */
function restoreSolo() {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || 'null');
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    return;
  }
  if (!saved || !Array.isArray(saved.mv) || !rules.reset(saved.mv)) return;
  solo.myColor = saved.me === 'b' ? 'b' : 'w';
  menu.level = [1, 2, 3].includes(saved.level) ? saved.level : 2;
  solo.result = validResult(saved.r) || rules.outcome();
  solo.state = solo.result ? 'ended' : 'playing';
  enterGame();
  maybeComputer();
}

// ---- Starting, ending, the menu -------------------------------------------------
const pickSide = (side) => (side === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : side);

function startSolo() {
  aiToken++;
  thinking = false;
  solo.myColor = pickSide(menu.side);
  solo.result = null;
  solo.state = 'playing';
  rules.reset();
  enterGame();
  maybeComputer();
}

function startHost(color) {
  ref.start(color);
  enterGame();
  toGuest(ref.gameMessage(menu.myName));
  saveHost();
}

/** Shows the board for the game that is now in the rules (new, continued or rejoined). */
function enterGame() {
  screen = 'game';
  selected = null;
  targets = [];
  promoToken++;
  hud.closePromotion();
  resultShown = false;
  confirmUntil = 0;
  pieces.reset(rules);
  rig.viewSide(myColor());
  menuUi.show(false);
  hud.hideResult();
  hud.show(true);
  rig.setAutoRotate(false);
}

function showMenu() {
  screen = 'menu';
  selected = null;
  targets = [];
  promoToken++;
  hud.closePromotion();
  hud.hideResult();
  hud.show(false);
  hud.tip(null);
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
  const { title, text, mood } = describeResult(r, myColor(), names());
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
  else if (ROLE === 'host') startHost(ref.guestColor);
  refresh();
};
document.getElementById('toMenu').onclick = backToMenu;
document.getElementById('look').onclick = () => hud.hideResult();

// ---- Playing a move -----------------------------------------------------------
const canMove = () =>
  screen === 'game' && phase() === 'playing' && rules.turn === myColor() && !pieces.busy() && !thinking;

function play(m) {
  if (ROLE === 'solo') {
    const mv = rules.move(m);
    if (!mv) return;
    pieces.play(mv);
    soloCheckEnd();
    maybeComputer();
  } else if (ROLE === 'host') {
    const done = ref.hostMove(m);
    if (!done) return;
    pieces.play(done.mv);
    toGuest(done.msg);
    sendEnd();
    saveHost();
  } else {
    const done = copy.tryMove(m);
    if (!done) return;
    pieces.play(done.mv);
    toHost(done.msg);
  }
}

async function onSquare(sq) {
  if (!canMove()) return;
  if (selected) {
    const hits = targets.filter((m) => m.to === sq);
    if (hits.length) {
      const from = selected;
      let promotion;
      if (hits.some((m) => m.promotion)) {
        const token = ++promoToken;
        promotion = await hud.choosePromotion(myColor());
        if (token !== promoToken || !promotion || !canMove()) {
          refresh();
          return;
        }
      }
      selected = null;
      targets = [];
      play({ from, to: sq, promotion });
      refresh();
      return;
    }
  }
  const piece = rules.get(sq);
  if (piece && piece.color === myColor() && sq !== selected) {
    selected = sq;
    targets = rules.movesFrom(sq);
  } else {
    selected = null;
    targets = [];
  }
  refresh();
}

function undo() {
  if (ROLE !== 'solo' || solo.state === 'menu') return;
  aiToken++;
  thinking = false;
  rules.undo();
  if (rules.turn !== solo.myColor) rules.undo();
  solo.result = null;
  solo.state = 'playing';
  enterGame();
  maybeComputer();
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
    solo.result = { w: other(solo.myColor), why: 'resign' };
    solo.state = 'ended';
  } else if (ROLE === 'host') {
    if (ref.resign(ref.hostColor)) {
      sendEnd();
      saveHost();
    }
  } else {
    toHost({ t: 'resign' });
  }
  refresh();
}

document.getElementById('undo').onclick = undo;
document.getElementById('resign').onclick = resign;
document.getElementById('cam').onclick = () => rig.viewSide(myColor());
document.getElementById('daynight').onclick = () => view.toggleNight();
window.addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'c') rig.viewSide(myColor());
  if (k === 'n') view.toggleNight();
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
  const { square } = board.pick(e.clientX, e.clientY, view.camera, pieces.group.children);
  if (square) onSquare(square);
});
canvas.addEventListener('pointermove', (e) => {
  if (screen !== 'game' || e.pointerType !== 'mouse' || down) {
    hud.tip(null);
    return;
  }
  const { piece } = board.pick(e.clientX, e.clientY, view.camera, pieces.group.children);
  hud.tip(piece || null, e.clientX, e.clientY);
  canvas.style.cursor = piece ? 'pointer' : '';
});
canvas.addEventListener('pointerleave', () => hud.tip(null));

// ---- What the screen shows -----------------------------------------------------------
function statusText() {
  const r = result();
  if (r) return describeResult(r, myColor(), names()).title;
  const check = rules.inCheck() ? 'Check! ' : '';
  if (rules.turn === myColor()) return check + 'Your move';
  if (ROLE === 'solo') return check + (thinking ? 'The computer is thinking…' : "The computer's move");
  return check + `${menu.otherName} to move`;
}

function refresh() {
  menuUi.render(menu);
  if (screen !== 'game') return;
  // A finished game or the other player's turn ends the selection.
  if (selected && !canMove() && !pieces.busy()) {
    selected = null;
    targets = [];
  }
  if (phase() !== 'playing') {
    promoToken++;
    hud.closePromotion();
  }
  const history = rules.history();
  board.show({
    last: history[history.length - 1] || null,
    check: rules.checkedKing(),
    selected,
    targets,
  });
  hud.setStatus(statusText(), rules.inCheck() && !result());
  const me = myColor();
  const opponent =
    ROLE === 'solo' ? `Computer (${LEVEL_NAMES[menu.level]})` : menu.otherHere || ROLE === 'guest' ? menu.otherName : `${menu.otherName} (away)`;
  hud.setPlayers(
    [
      { name: ROLE === 'solo' ? `You (${SIDE_NAMES[me]})` : `${menu.myName} (you)`, color: me },
      { name: opponent, color: other(me) },
    ],
    result() ? null : rules.turn,
  );
  hud.setMoves(rules.notation());
  const ended = phase() === 'ended';
  hud.setButtons({
    undo: { shown: ROLE === 'solo', enabled: rules.plies >= (solo.myColor === 'w' ? 1 : 2) && !pieces.busy() },
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

  // The selected piece hops a little.
  if (selected) {
    const p = pieces.pieceOn(selected);
    if (p && !calm) p.position.y = Math.abs(Math.sin(clock * 5)) * 0.12;
  }
  for (const p of pieces.group.children) {
    if (p.userData.square !== selected && !p.userData.walking && p.position.y > 0 && !pieces.busy()) p.position.y = 0;
  }

  // When the last move has walked, the buttons wake up and the result shows.
  const busy = pieces.busy();
  if (wasBusy && !busy) refresh();
  wasBusy = busy;
  if (screen === 'game' && phase() === 'ended' && !resultShown && !busy) {
    resultShown = true;
    showResultCard();
  }

  view.renderer.render(view.scene, view.camera);
}

// After "Reload" in the notice above, a game alone goes on.
if (ROLE === 'solo') restoreSolo();
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
