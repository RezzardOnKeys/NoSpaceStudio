// Die Together – the referee. Only one browser runs this: the party host.
// It owns the seats in the menu, decides when a round may start and runs
// the round: it moves every character from the inputs of its two players
// and sends the result to everybody. Everybody else, including the host's
// own screen, only receives the messages sent from here.

import {
  MAX_PLAYERS, TEAMS, SEATS, MAP, SPAWNS, ARENA_HALF, PLAYER_R, SPEED, JUMP_V, GRAVITY,
  STEP_UP, MAX_PITCH, STATE_MS, surfaceTop,
} from './config.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const round3 = (v) => Math.round(v * 1000) / 1000;

/**
 * expected: how many people the launcher's party has (the "players" value
 * from the address), or null if it is unknown.
 */
export function createHost({ expected }) {
  /** Everybody who is connected. team/seat are null until they sit down. */
  const players = [];
  /** The characters of the running round. */
  let chars = [];
  let phase = 'lobby'; // lobby | round
  let lastTick = 0;
  let lastState = 0;
  let nextId = 1;

  const seatOwner = (team, seat) => players.find((p) => p.team === team && p.seat === seat);
  const teamIsUsed = (team) => players.some((p) => p.team === team);
  /** How many people should be here: the party size, or whoever connected. */
  const people = () => expected ?? players.length;

  /** With exactly 2 people a bot character joins, on the last unused team.
   *  If a player sits down there, the bot moves to another one. */
  function botTeam() {
    if (people() !== 2) return null;
    return TEAMS.findLastIndex((_, team) => !teamIsUsed(team));
  }

  /** Why the round cannot start yet, as a sentence for the menu. '' = it can. */
  function startProblem() {
    const count = people();
    if (count < 2 || count % 2 === 1) {
      return `Die Together needs 2, 4, 6 or 8 players. Your party has ${count}.`;
    }
    const missing = count - players.length;
    if (missing === 1) return 'Waiting for 1 more player…';
    if (missing > 1) return `Waiting for ${missing} more players…`;
    const standing = players.filter((p) => p.team === null).map((p) => p.name);
    if (standing.length > 0) return `Waiting for ${standing.join(', ')} to pick a seat…`;
    const halfTeam = TEAMS.some(
      (_, team) => teamIsUsed(team) && !SEATS.every((seat) => seatOwner(team, seat.id)),
    );
    if (halfTeam) return 'Every team needs a mouse and a keyboard player.';
    return '';
  }

  function broadcast(msg) {
    for (const p of players) p.send(msg);
  }

  function lobbyMessage(note) {
    return {
      t: 'lobby',
      note: note || '',
      expected: people(),
      players: players.map((p) => ({ id: p.id, name: p.name, team: p.team, seat: p.seat })),
      botTeam: botTeam(),
      problem: startProblem(),
    };
  }

  const sendLobby = (note) => broadcast(lobbyMessage(note));

  /** Back to the menu. Everybody keeps their seat and may pick a new one. */
  function toLobby(note) {
    phase = 'lobby';
    chars = [];
    sendLobby(note);
  }

  function cleanName(name) {
    return String(name || '').replace(/[^\w .-]/g, '').slice(0, 20);
  }

  /** Adds a person. isHost marks the one who may press Start. Returns the id. */
  function addPlayer({ name, send, isHost = false }) {
    const p = {
      id: `p${nextId++}`,
      name: cleanName(name) || 'Player',
      send,
      isHost,
      team: null,
      seat: null,
    };
    players.push(p);
    send({ t: 'welcome', id: p.id });
    if (phase === 'lobby') sendLobby();
    // Somebody who arrives in the middle of a round watches until it ends.
    else send(roundMessage());
    return p.id;
  }

  function removePlayer(id) {
    const i = players.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [gone] = players.splice(i, 1);
    if (phase === 'lobby') {
      sendLobby(`${gone.name} left the game.`);
    } else {
      // A character that lost one of its two players is out.
      chars = chars.filter((c) => c.mouseId !== id && c.keyboardId !== id);
    }
  }

  const isFull = () => players.length >= MAX_PLAYERS;

  /** Sits down on a free seat; clicking the own seat stands up again. */
  function takeSeat(p, team, seat) {
    if (!Number.isInteger(team) || !TEAMS[team]) return;
    if (!SEATS.some((s) => s.id === seat)) return;
    const owner = seatOwner(team, seat);
    if (owner && owner !== p) return;
    p.team = owner ? null : team;
    p.seat = owner ? null : seat;
  }

  // ---- The round -------------------------------------------------------------
  function makeChar(team, index, isBot) {
    const spot = SPAWNS[index];
    return {
      team,
      isBot,
      mouseId: isBot ? null : seatOwner(team, 'mouse').id,
      keyboardId: isBot ? null : seatOwner(team, 'keyboard').id,
      x: spot.x, y: 0, z: spot.z,
      vy: 0,
      onGround: true,
      // Looking at the middle of the arena. Yaw 0 looks along -z.
      yaw: Math.atan2(spot.x, spot.z),
      pitch: 0,
      keys: { f: false, b: false, l: false, r: false, j: false },
    };
  }

  function roundMessage() {
    return {
      t: 'round',
      chars: chars.map((c) => ({
        team: c.team, isBot: c.isBot, mouse: c.mouseId, keyboard: c.keyboardId,
        x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch,
      })),
    };
  }

  function startRound() {
    const used = TEAMS.map((_, team) => team).filter(teamIsUsed);
    chars = used.map((team, index) => makeChar(team, index, false));
    const bot = botTeam();
    if (bot !== null) chars.push(makeChar(bot, chars.length, true));
    phase = 'round';
    lastState = 0;
    broadcast(roundMessage());
  }

  /** Pushes the character out of an obstacle it cannot simply step onto. */
  function pushOut(c, o) {
    const minX = o.x - o.w / 2;
    const maxX = o.x + o.w / 2;
    const minZ = o.z - o.d / 2;
    const maxZ = o.z + o.d / 2;
    // The point of the obstacle that is nearest to the character.
    const nx = clamp(c.x, minX, maxX);
    const nz = clamp(c.z, minZ, maxZ);
    if (c.y + STEP_UP >= surfaceTop(o, nx, nz)) return; // low enough to walk onto
    const dx = c.x - nx;
    const dz = c.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= PLAYER_R * PLAYER_R) return;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      c.x = nx + (dx / d) * PLAYER_R;
      c.z = nz + (dz / d) * PLAYER_R;
      return;
    }
    // The centre is inside the obstacle: leave through the nearest side.
    const exits = [
      [c.x - minX, () => (c.x = minX - PLAYER_R)],
      [maxX - c.x, () => (c.x = maxX + PLAYER_R)],
      [c.z - minZ, () => (c.z = minZ - PLAYER_R)],
      [maxZ - c.z, () => (c.z = maxZ + PLAYER_R)],
    ];
    exits.sort((a, b) => a[0] - b[0]);
    exits[0][1]();
  }

  /** Height of the highest thing under the character's feet that it can stand on. */
  function groundUnder(c, feetY) {
    let ground = 0;
    const reach = PLAYER_R * 0.6;
    for (const o of MAP) {
      const nx = clamp(c.x, o.x - o.w / 2, o.x + o.w / 2);
      const nz = clamp(c.z, o.z - o.d / 2, o.z + o.d / 2);
      if ((c.x - nx) ** 2 + (c.z - nz) ** 2 > reach * reach) continue;
      const top = surfaceTop(o, nx, nz);
      if (top <= feetY + STEP_UP && top > ground) ground = top;
    }
    return ground;
  }

  /** Moves one character for a small moment dt (seconds). */
  function moveChar(c, dt) {
    // Walking: W A S D relative to where the character looks.
    const k = c.keys;
    const forward = (k.f ? 1 : 0) - (k.b ? 1 : 0);
    const side = (k.r ? 1 : 0) - (k.l ? 1 : 0);
    if (forward !== 0 || side !== 0) {
      const len = Math.hypot(forward, side);
      const sin = Math.sin(c.yaw);
      const cos = Math.cos(c.yaw);
      c.x += ((-sin * forward + cos * side) / len) * SPEED * dt;
      c.z += ((-cos * forward - sin * side) / len) * SPEED * dt;
    }
    if (k.j && c.onGround) {
      c.vy = JUMP_V;
      c.onGround = false;
    }

    // Sideways: the outer walls, then the obstacles.
    const limit = ARENA_HALF - PLAYER_R;
    c.x = clamp(c.x, -limit, limit);
    c.z = clamp(c.z, -limit, limit);
    for (const o of MAP) pushOut(c, o);

    // Up and down: gravity, landing, and staying on a ramp when walking down.
    const feetBefore = c.y;
    c.vy -= GRAVITY * dt;
    c.y += c.vy * dt;
    const ground = groundUnder(c, feetBefore);
    if (c.y <= ground) {
      c.y = ground;
      c.vy = 0;
      c.onGround = true;
    } else if (c.onGround && c.vy <= 0 && c.y - ground <= STEP_UP) {
      c.y = ground;
      c.vy = 0;
    } else {
      c.onGround = false;
    }
  }

  function sendState() {
    broadcast({
      t: 'state',
      chars: chars.map((c) => ({
        team: c.team,
        x: round3(c.x), y: round3(c.y), z: round3(c.z),
        yaw: round3(c.yaw), pitch: round3(c.pitch),
      })),
    });
  }

  /** A message from a player (over the network or from the host's own screen). */
  function handle(id, msg) {
    const p = players.find((q) => q.id === id);
    if (!p || !msg || typeof msg.t !== 'string') return;

    if (msg.t === 'hello') {
      p.name = cleanName(msg.name) || p.name;
      if (phase === 'lobby') sendLobby();
    } else if (msg.t === 'seat' && phase === 'lobby') {
      takeSeat(p, msg.team, msg.seat);
      sendLobby();
    } else if (msg.t === 'start' && phase === 'lobby' && p.isHost) {
      if (startProblem() === '') startRound();
      else sendLobby();
    } else if (msg.t === 'keys' && phase === 'round') {
      // Only the keyboard player of a character can move it.
      const c = chars.find((q) => q.keyboardId === id);
      if (!c) return;
      for (const key of Object.keys(c.keys)) c.keys[key] = msg[key] === true;
    } else if (msg.t === 'look' && phase === 'round') {
      // Only the mouse player of a character can turn its view.
      const c = chars.find((q) => q.mouseId === id);
      if (!c || !isNumber(msg.yaw) || !isNumber(msg.pitch)) return;
      c.yaw = Math.atan2(Math.sin(msg.yaw), Math.cos(msg.yaw));
      c.pitch = clamp(msg.pitch, -MAX_PITCH, MAX_PITCH);
    } else if (msg.t === 'end' && phase === 'round' && p.isHost) {
      // Until rounds have a winner, the host ends them by hand.
      toLobby();
    }
  }

  /** Called many times per second with the current time in milliseconds. */
  function tick(now) {
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    if (phase !== 'round') return;
    // Small equal steps keep the collisions exact, whatever the pace.
    const steps = Math.max(1, Math.ceil(dt * 60));
    for (let i = 0; i < steps; i++) for (const c of chars) moveChar(c, dt / steps);
    if (now - lastState >= STATE_MS) {
      lastState = now;
      sendState();
    }
  }

  return { addPlayer, removePlayer, handle, tick, isFull };
}
