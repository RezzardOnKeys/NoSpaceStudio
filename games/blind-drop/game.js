// Blind Drop – one player's screen: it reacts to the referee's messages,
// reads the player's input and runs the frame loop. Every browser runs this
// file. In practice mode and for the party host the referee (host.js) runs in
// the same browser; a party guest reaches it over the network (net.js). The
// code path is the same.
//
// The files and what they do:
//   config.js   numbers and rules that can be tuned
//   host.js     the referee (only in the host's browser), bot.js its bot
//   net.js      party connection with PeerJS
//   scene.js    the 3D view (look.js, world.js, characters.js, effects.js)
//   lobby.js    the menu before a match
//   hud.js      banner, countdown, notices, result screen
//   game.js     this file

import {
  SPEED, PLAYER_R, REVEAL_MS, DROP_AT, FALL_MS, MODES, DEFAULT_MODE, DEFAULT_BLAST,
  startRadius, spawnPoint, clampToIsland,
} from './config.js';
import { createView } from './scene.js';
import { createHost } from './host.js';
import { createLobby } from './lobby.js';
import {
  setBanner, toast, setCountdown, hideCountdown, showScreen, showResult, onRematch,
  setSnipeLook,
} from './hud.js';
import { openRoom, joinRoom } from './net.js';

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

const canvas = document.getElementById('view');
const view = createView(canvas, document.getElementById('labels'));

// ---- State of this player's screen --------------------------------------
let host = null; // the referee, if it runs in this browser
let toHost = () => {}; // sends a message to the referee
let myId = null;
let roster = []; // [{ id, name, color, ready, isBot }]
let ownerId = null; // the player who picks mode and blast size (party host)
let matchMode = DEFAULT_MODE; // key of MODES chosen for the next match
let blastSize = DEFAULT_BLAST; // key of BLAST_SIZES chosen for the next match
let phase = 'lobby'; // lobby | look | action | locked | reveal | result
let phaseEnd = 0;
let phaseDur = 1;
let radius = startRadius(DEFAULT_MODE);
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

// ---- Lobby ----------------------------------------------------------------
const lobby = createLobby({
  solo: !PARTY,
  onColor: (color) => toHost({ t: 'color', color }),
  onMode: (mode) => toHost({ t: 'mode', mode }),
  onBlast: (size) => toHost({ t: 'blast', size }),
  onReady() {
    const mine = playerOf(myId);
    // Practice mode has a "Start" button; in a party "Ready" can be taken back.
    if (mine) toHost({ t: 'ready', ready: PARTY ? !mine.ready : true });
  },
});
onRematch(() => toHost({ t: 'rematch' }));

function renderLobby() {
  lobby.render({
    roster, myId, ownerId, mode: matchMode, blast: blastSize, status: netStatus,
  });
}

/** Classic or Snipe: switches the look of the scene and of the HUD. */
function setMode(mode) {
  matchMode = MODES[mode] ? mode : DEFAULT_MODE;
  view.setTheme(matchMode);
  setSnipeLook(matchMode === 'snipe');
}

/** Shows the menu with everybody standing on the island behind it. */
function showLobby() {
  phase = 'lobby';
  timeline = [];
  myBomb = null;
  radius = startRadius(matchMode);
  view.setRadius(radius, false);
  view.setAim('off');
  view.setPlayers(roster.map((p) => ({ id: p.id, color: p.color, label: nameOf(p.id) })));
  roster.forEach((p, i) => {
    const spot = spawnPoint(i, roster.length, radius);
    view.resetPose(p.id);
    view.place(p.id, spot.x, spot.z);
    view.setVisible(p.id, true);
  });
  showScreen('lobby');
  renderLobby();
}

/** The referee sent the lobby: who is there and what the host has chosen. */
function onLobby(msg) {
  roster = msg.players;
  ownerId = msg.ownerId;
  blastSize = msg.blast;
  setMode(msg.mode);
  showLobby();
  if (msg.note) toast(msg.note);
}

/** Guest only: the connection to the host is gone, wait in an empty menu. */
function showWaiting() {
  myId = null;
  roster = [];
  showLobby();
}

// ---- Messages from the referee ----------------------------------------------
function onEvent(msg) {
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'welcome') myId = msg.id;
  else if (msg.t === 'lobby') onLobby(msg);
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
  setMode(msg.mode);
  view.setBlast(msg.blastR);
  view.setRadius(radius, false);
  view.setAim('off');
  for (const p of msg.players) {
    view.resetPose(p.id);
    view.setMoving(p.id, 0, 0);
    view.appear(p.id, p.x, p.z);
    if (p.id === myId) Object.assign(me, { x: p.x, z: p.z });
  }
  showScreen('match', msg.round);
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
  hideCountdown();
}

// d) + e) Reveal: everybody is shown, the bombs fall, then the verdict.
function onReveal(msg) {
  lockInput();
  phase = 'reveal';
  hideCountdown();
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
  if (msg.outcome === 'miss') {
    // Snipe: nobody was hit and nothing changes, the next round follows.
    after(REVEAL_MS - 400, () => setBanner('MISSED!', 'Next round'));
  } else if (msg.outcome === 'shrink') {
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
    after(REVEAL_MS, () => {
      phase = 'result';
      showResult(verdict(msg));
    });
  }
}

/** Turns the referee's result into the words for this player. */
function verdict(msg) {
  if (msg.outcome === 'draw') {
    return { title: 'DRAW!', tone: 'draw', text: 'Nobody is left standing.' };
  }
  if (msg.winners.includes(myId)) {
    const text = msg.hits
      .map((h) =>
        h.by.includes(myId)
          ? `Your bomb hit ${nameOf(h.id)}.`
          : `${nameOf(h.id)} stood in their own blast.`,
      )
      .join(' ');
    return { title: 'YOU WIN!', tone: 'win', text };
  }
  const myHit = msg.hits.find((h) => h.id === myId);
  const text = myHit.by.includes(myId)
    ? 'You stood in your own blast.'
    : `${nameOf(myHit.by[0])}'s bomb got you.`;
  return { title: 'YOU LOSE!', tone: 'lose', text };
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
window.addEventListener('pointermove', (e) => {
  Object.assign(mouse, { x: e.clientX, y: e.clientY, known: true });
});
canvas.addEventListener('pointerdown', (e) => {
  window.focus();
  if (e.button === 0) placeBomb(e.clientX, e.clientY);
});

/** Moves the own character with the pressed keys and updates the aim circle. */
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
/** Game logic for the time since the last call; returns that time in seconds. */
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
  if (phase === 'look' || phase === 'action') setCountdown(phaseEnd - now, phaseDur);
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
/** A notice from the network code; empty text means "all fine". */
function setNetStatus(text) {
  netStatus = text;
  if (phase === 'lobby') renderLobby();
  else if (text) toast(text);
}

if (!PARTY || PARTY.role === 'host') {
  // The referee runs here: practice mode, or this player hosts the party.
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
  // Party guest: everything comes from the host over the network.
  showWaiting();
  joinRoom(PARTY.code, {
    onStatus(text) {
      // A notice means the connection is not there (any more): back to the
      // waiting screen, also in the middle of a match.
      if (text) showWaiting();
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
