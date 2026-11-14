// Blind Drop – the referee. Only one browser runs this: the party host (or
// your own browser in practice mode). It owns the timers, decides who was
// hit, shrinks the island and teleports players. Everybody else, including
// the host's own screen, only receives the messages sent from here.
//
// Secrecy rule: during the action phase nothing about positions or bombs is
// sent to anyone. Positions go out only in "look" (everyone is visible
// anyway) and in "reveal" (the round is over).

import {
  MAX_PLAYERS, ISLAND_R, BLAST_R, SHRINK_STEP, MIN_ISLAND_R, SPEED, PLAYER_R,
  LOOK_MS, ACTION_MS, COLLECT_MS, REVEAL_MS, SHRINK_MS, COLORS,
  spawnPoint, clampToIsland,
} from './config.js';

export function createHost() {
  /** All players of the match, humans and bots, as one list. */
  const players = [];
  let phase = 'lobby'; // lobby | look | action | collect | reveal | result
  let round = 0;
  let radius = ISLAND_R;
  let deadline = 0;
  let lastTick = 0;
  let afterReveal = null;
  let nextId = 1;

  const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
  const colorTaken = (hex, except) => players.some((p) => p !== except && p.color === hex);
  const freeColor = (except) => COLORS.find((c) => !colorTaken(c.hex, except)).hex;

  function broadcast(msg) {
    for (const p of players) if (p.send) p.send(msg);
  }

  function sendLobby(note) {
    broadcast({
      t: 'lobby',
      note: note || '',
      players: players.map((p) => ({
        id: p.id, name: p.name, color: p.color, ready: p.ready, isBot: p.isBot,
      })),
    });
  }

  function toLobby(note) {
    phase = 'lobby';
    for (const p of players) p.ready = p.isBot;
    sendLobby(note);
  }

  /** Adds a human (with a send function) or a bot. Returns the player id. */
  function addPlayer({ name, isBot = false, send = null }) {
    const p = {
      id: `p${nextId++}`,
      name: cleanName(name) || (isBot ? 'Bot' : 'Player'),
      isBot, send,
      color: freeColor(null),
      ready: isBot,
      x: 0, z: 0, startX: 0, startZ: 0,
      bomb: null,
      final: false,
      ai: null,
    };
    players.push(p);
    if (send) send({ t: 'welcome', id: p.id });
    toLobby(phase === 'lobby' ? '' : `${p.name} joined. Back to the lobby.`);
    return p.id;
  }

  function removePlayer(id) {
    const i = players.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [gone] = players.splice(i, 1);
    toLobby(`${gone.name} left the game.`);
  }

  const isFull = () => players.length >= MAX_PLAYERS;

  function cleanName(name) {
    return String(name || '').replace(/[^\w .-]/g, '').slice(0, 20);
  }

  /** Accepts a position only if it is on the island and reachable on foot. */
  function setPosition(p, x, z) {
    if (!isNumber(x) || !isNumber(z)) return;
    const reach = SPEED * (ACTION_MS / 1000) * 1.15 + 0.5;
    let dx = x - p.startX;
    let dz = z - p.startZ;
    const d = Math.hypot(dx, dz);
    if (d > reach) {
      dx *= reach / d;
      dz *= reach / d;
    }
    const pos = clampToIsland(p.startX + dx, p.startZ + dz, radius, PLAYER_R);
    p.x = pos.x;
    p.z = pos.z;
  }

  /** A bomb can be set once per round and never moved afterwards. */
  function setBomb(p, bomb) {
    if (p.bomb || !bomb || !isNumber(bomb.x) || !isNumber(bomb.z)) return;
    p.bomb = clampToIsland(bomb.x, bomb.z, radius);
  }

  /** A message from a player (over the network or from the host's own screen). */
  function handle(id, msg) {
    const p = players.find((q) => q.id === id);
    if (!p || !msg || typeof msg.t !== 'string') return;
    const acting = phase === 'action' || phase === 'collect';

    if (msg.t === 'hello') {
      p.name = cleanName(msg.name) || p.name;
      if (phase === 'lobby') sendLobby();
    } else if (msg.t === 'color' && phase === 'lobby') {
      if (!COLORS.some((c) => c.hex === msg.color)) return;
      const owner = players.find((q) => q !== p && q.color === msg.color);
      // A bot gives its colour away; another human keeps theirs.
      if (owner && !owner.isBot) return sendLobby();
      p.color = msg.color;
      if (owner) owner.color = freeColor(owner);
      sendLobby();
    } else if (msg.t === 'ready' && phase === 'lobby') {
      p.ready = Boolean(msg.ready);
      sendLobby();
    } else if (msg.t === 'pos' && acting && !p.final) {
      setPosition(p, msg.x, msg.z);
    } else if (msg.t === 'bomb' && acting && !p.final) {
      setBomb(p, msg);
    } else if (msg.t === 'final' && acting && !p.final) {
      setPosition(p, msg.x, msg.z);
      setBomb(p, msg.bomb);
      p.final = true;
    } else if (msg.t === 'rematch' && phase === 'result') {
      toLobby();
    }
  }

  function startMatch() {
    round = 0;
    radius = ISLAND_R;
    players.forEach((p, i) => {
      const spot = spawnPoint(i, players.length);
      p.x = spot.x;
      p.z = spot.z;
    });
    startRound();
  }

  // a) Look: everybody is visible and frozen.
  function startRound() {
    round += 1;
    for (const p of players) {
      p.bomb = null;
      p.final = false;
      p.startX = p.x;
      p.startZ = p.z;
    }
    phase = 'look';
    deadline = lastTick + LOOK_MS;
    broadcast({
      t: 'look', round, radius, dur: LOOK_MS,
      players: players.map((p) => ({ id: p.id, x: p.x, z: p.z })),
    });
  }

  // b) + c) Action: opponents are invisible, everybody walks and drops once.
  function startAction() {
    phase = 'action';
    deadline = lastTick + ACTION_MS;
    for (const p of players) if (p.isBot) planBot(p);
    broadcast({ t: 'action', dur: ACTION_MS });
  }

  // d) + e) Reveal: decide who was hit and tell everyone the whole truth.
  function resolve() {
    const bombs = players
      .filter((p) => p.bomb)
      .map((p) => ({ id: p.id, x: p.bomb.x, z: p.bomb.z }));
    // A player is hit by every bomb whose blast reaches them, also their own.
    const hits = [];
    for (const p of players) {
      const by = bombs
        .filter((b) => Math.hypot(p.x - b.x, p.z - b.z) <= BLAST_R)
        .map((b) => b.id);
      if (by.length > 0) hits.push({ id: p.id, by });
    }
    const positions = players.map((p) => ({ id: p.id, x: p.x, z: p.z }));

    let outcome;
    let winners = [];
    let newRadius = radius;
    const moved = [];
    if (hits.length === 0) {
      // Nobody hit: the island shrinks. Players outside are not out; they
      // are moved to the nearest point that is still on the island.
      outcome = 'shrink';
      newRadius = Math.max(MIN_ISLAND_R, radius - SHRINK_STEP);
      for (const p of players) {
        const pos = clampToIsland(p.x, p.z, newRadius, PLAYER_R);
        if (pos.x !== p.x || pos.z !== p.z) moved.push({ id: p.id, x: pos.x, z: pos.z });
      }
      afterReveal = () => {
        radius = newRadius;
        for (const m of moved) {
          const p = players.find((q) => q.id === m.id);
          if (p) {
            p.x = m.x;
            p.z = m.z;
          }
        }
        startRound();
      };
    } else {
      // The first hit ends the match. Whoever was not hit wins; if nobody
      // is left standing it is a draw.
      winners = players.filter((p) => !hits.some((h) => h.id === p.id)).map((p) => p.id);
      outcome = winners.length > 0 ? 'win' : 'draw';
      afterReveal = () => {
        phase = 'result';
      };
    }

    phase = 'reveal';
    deadline = lastTick + REVEAL_MS + (outcome === 'shrink' ? SHRINK_MS : 0);
    broadcast({ t: 'reveal', players: positions, bombs, hits, outcome, winners, newRadius, moved });
  }

  // ---- Bot (practice mode) ---------------------------------------------
  // Deliberately simple: it wanders around and drops its bomb at a random
  // moment, often near where it last saw a human.
  function randomSpot(maxRadius) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * maxRadius;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
  }

  function planBot(bot) {
    const humans = players.filter((p) => !p.isBot);
    let bombSpot = randomSpot(radius);
    if (humans.length > 0 && Math.random() < 0.65) {
      const victim = humans[Math.floor(Math.random() * humans.length)];
      const off = randomSpot(5);
      bombSpot = clampToIsland(victim.startX + off.x, victim.startZ + off.z, radius);
    }
    bot.ai = {
      target: randomSpot(radius - PLAYER_R),
      bombAt: lastTick + 500 + Math.random() * 3500,
      bombSpot,
    };
  }

  function moveBot(bot, dt, now) {
    const ai = bot.ai;
    if (!ai) return;
    if (!bot.bomb && now >= ai.bombAt) bot.bomb = ai.bombSpot;
    const dx = ai.target.x - bot.x;
    const dz = ai.target.z - bot.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.2) {
      // Pick the next spot; usually one outside of its own blast.
      for (let i = 0; i < 8; i++) {
        ai.target = randomSpot(radius - PLAYER_R);
        const safe = !bot.bomb ||
          Math.hypot(ai.target.x - bot.bomb.x, ai.target.z - bot.bomb.z) > BLAST_R + 0.6;
        if (safe || Math.random() < 0.15) break;
      }
      return;
    }
    const step = Math.min(d, SPEED * 0.9 * dt);
    const pos = clampToIsland(bot.x + (dx / d) * step, bot.z + (dz / d) * step, radius, PLAYER_R);
    bot.x = pos.x;
    bot.z = pos.z;
  }

  /** Called many times per second with the current time in milliseconds. */
  function tick(now) {
    const dt = Math.min(0.25, (now - lastTick) / 1000);
    lastTick = now;

    if (phase === 'lobby') {
      if (players.length >= 2 && players.every((p) => p.ready)) startMatch();
    } else if (phase === 'look') {
      if (now >= deadline) startAction();
    } else if (phase === 'action') {
      for (const p of players) if (p.isBot) moveBot(p, dt, now);
      if (now >= deadline) {
        // Time is up. Humans answer with their last position ("final").
        phase = 'collect';
        deadline = now + COLLECT_MS;
        broadcast({ t: 'lock' });
      }
    } else if (phase === 'collect') {
      if (now >= deadline || players.every((p) => p.isBot || p.final)) resolve();
    } else if (phase === 'reveal') {
      if (now >= deadline) {
        const next = afterReveal;
        afterReveal = null;
        if (next) next();
      }
    }
  }

  return { addPlayer, removePlayer, handle, tick, isFull };
}
