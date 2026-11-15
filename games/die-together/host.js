// Die Together – the referee. Only one browser runs this: the party host.
// It owns the seats in the menu, decides when a round may start and runs
// the round: it moves every character from the inputs of its two players,
// decides which shots hit, counts lives, closes the walls and names the
// winner. Everybody else, including the host's own screen, only receives
// the messages sent from here.

import {
  MAX_PLAYERS, TEAMS, SEATS, MAP, SPAWNS, ARENA_HALF, PLAYER_R, PLAYER_H, EYE_H, SPEED,
  JUMP_V, GRAVITY, STEP_UP, MAX_PITCH, STATE_MS, LIVES, MAGAZINE, SHOT_MS, RELOAD_MS,
  COUNTDOWN_MS, WINNER_MS, surfaceTop, sinkOf, arenaHalf,
} from './config.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const round3 = (v) => Math.round(v * 1000) / 1000;
/** A shot that hits nothing (the sky) ends after this distance. */
const SKY_RANGE = 120;

/**
 * expected: how many people the launcher's party has (the "players" value
 * from the address), or null if it is unknown.
 */
export function createHost({ expected }) {
  /** Everybody who is connected. team/seat are null until they sit down. */
  const players = [];
  /** The characters of the running round. */
  let chars = [];
  let phase = 'lobby'; // lobby | countdown | fight | winner
  let deadline = 0; // end of the countdown or of the winner screen
  let fightStart = 0;
  /** Where the outer walls are right now (half the side length). */
  let half = ARENA_HALF;
  /** How deep each obstacle of MAP has sunk into the floor. */
  let sinks = MAP.map(() => 0);
  /** Shots that arrived since the last tick; they are judged together. */
  let pendingShots = [];
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
      return;
    }
    // A character that lost one of its two players is out.
    const c = chars.find((q) => q.alive && (q.mouseId === id || q.keyboardId === id));
    if (c) knockOut(c);
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

  // ---- A round: start, countdown, fight, winner -------------------------------
  function makeChar(team, index, isBot) {
    const spot = SPAWNS[index];
    const mouse = isBot ? null : seatOwner(team, 'mouse');
    const keyboard = isBot ? null : seatOwner(team, 'keyboard');
    return {
      team,
      isBot,
      mouseId: mouse?.id ?? null,
      keyboardId: keyboard?.id ?? null,
      names: isBot ? ['Bot'] : [mouse.name, keyboard.name],
      alive: true,
      lives: LIVES,
      ammo: MAGAZINE,
      nextShotAt: 0, // time from which the next shot is allowed
      reloadEnd: 0, // time when the running reload is finished; 0 = not reloading
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
      // How long the countdown still runs; 0 when the fight is already on.
      countdown: phase === 'countdown' ? Math.max(0, deadline - lastTick) : 0,
      half,
      chars: chars
        .filter((c) => c.alive)
        .map((c) => ({
          team: c.team, isBot: c.isBot, mouse: c.mouseId, keyboard: c.keyboardId,
          x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch,
          lives: c.lives, ammo: c.ammo,
        })),
    };
  }

  function setWalls(newHalf) {
    half = newHalf;
    sinks = MAP.map((o) => sinkOf(o, half));
  }

  function startRound() {
    const used = TEAMS.map((_, team) => team).filter(teamIsUsed);
    chars = used.map((team, index) => makeChar(team, index, false));
    const bot = botTeam();
    if (bot !== null) chars.push(makeChar(bot, chars.length, true));
    setWalls(ARENA_HALF);
    pendingShots = [];
    phase = 'countdown';
    deadline = lastTick + COUNTDOWN_MS;
    lastState = 0;
    broadcast(roundMessage());
  }

  /** A character is out for this round. */
  function knockOut(c) {
    c.alive = false;
    broadcast({ t: 'out', team: c.team, x: c.x, y: c.y, z: c.z });
  }

  /** The last character standing wins; nobody left is a draw. */
  function checkEnd(now) {
    const alive = chars.filter((c) => c.alive);
    if (alive.length > 1) return;
    const winner = alive[0] ?? null;
    phase = 'winner';
    deadline = now + WINNER_MS;
    broadcast({ t: 'winner', team: winner?.team ?? null, names: winner?.names ?? [] });
  }

  // ---- Movement ---------------------------------------------------------------
  /** Top of obstacle number i at the point (x, z), with its sinking included. */
  const topOf = (i, x, z) => surfaceTop(MAP[i], x, z) - sinks[i];

  /** Pushes the character out of an obstacle it cannot simply step onto. */
  function pushOut(c, i) {
    const o = MAP[i];
    const minX = o.x - o.w / 2;
    const maxX = o.x + o.w / 2;
    const minZ = o.z - o.d / 2;
    const maxZ = o.z + o.d / 2;
    // The point of the obstacle that is nearest to the character.
    const nx = clamp(c.x, minX, maxX);
    const nz = clamp(c.z, minZ, maxZ);
    if (c.y + STEP_UP >= topOf(i, nx, nz)) return; // low enough to walk onto
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
    MAP.forEach((o, i) => {
      const nx = clamp(c.x, o.x - o.w / 2, o.x + o.w / 2);
      const nz = clamp(c.z, o.z - o.d / 2, o.z + o.d / 2);
      if ((c.x - nx) ** 2 + (c.z - nz) ** 2 > reach * reach) return;
      const top = topOf(i, nx, nz);
      if (top <= feetY + STEP_UP && top > ground) ground = top;
    });
    return ground;
  }

  /** Moves one character for a small moment dt (seconds). */
  function moveChar(c, dt, canWalk) {
    // Walking: W A S D relative to where the character looks.
    const k = c.keys;
    const forward = canWalk ? (k.f ? 1 : 0) - (k.b ? 1 : 0) : 0;
    const side = canWalk ? (k.r ? 1 : 0) - (k.l ? 1 : 0) : 0;
    if (forward !== 0 || side !== 0) {
      const len = Math.hypot(forward, side);
      const sin = Math.sin(c.yaw);
      const cos = Math.cos(c.yaw);
      c.x += ((-sin * forward + cos * side) / len) * SPEED * dt;
      c.z += ((-cos * forward - sin * side) / len) * SPEED * dt;
    }
    if (canWalk && k.j && c.onGround) {
      c.vy = JUMP_V;
      c.onGround = false;
    }

    // Sideways: the outer walls push the character inwards (that costs no
    // life), then the obstacles push it out of themselves.
    const limit = half - PLAYER_R;
    c.x = clamp(c.x, -limit, limit);
    c.z = clamp(c.z, -limit, limit);
    for (let i = 0; i < MAP.length; i++) pushOut(c, i);

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

  // ---- Shooting ---------------------------------------------------------------
  // A shot is a straight line from the eyes (hitscan). The helpers below
  // return how far along the line something is hit, or Infinity for a miss.

  /** Narrows the stretch [span.from, span.to] of the line to where start + t * dir lies between min and max. */
  function clipSlab(span, start, dir, min, max) {
    if (Math.abs(dir) < 1e-9) {
      if (start < min || start > max) span.to = -1;
      return;
    }
    const a = (min - start) / dir;
    const b = (max - start) / dir;
    span.from = Math.max(span.from, Math.min(a, b));
    span.to = Math.min(span.to, Math.max(a, b));
  }

  function rayObstacle(i, ox, oy, oz, dx, dy, dz) {
    const o = MAP[i];
    const sink = sinks[i];
    if (o.h - sink <= 0) return Infinity;
    const span = { from: 0, to: Infinity };
    clipSlab(span, ox, dx, o.x - o.w / 2, o.x + o.w / 2);
    clipSlab(span, oz, dz, o.z - o.d / 2, o.z + o.d / 2);
    clipSlab(span, oy, dy, -1, o.h - sink);
    if (o.kind === 'ramp') {
      // Only the part below the slope is solid. "above" is how far a point
      // is above the slope; along the line it changes evenly.
      let above;
      let change;
      if (o.dir === '+x' || o.dir === '-x') {
        const k = o.h / o.w;
        const sign = o.dir === '+x' ? 1 : -1;
        const lowEdge = o.x - (sign * o.w) / 2;
        above = oy - k * sign * (ox - lowEdge) + sink;
        change = dy - k * sign * dx;
      } else {
        const k = o.h / o.d;
        const sign = o.dir === '+z' ? 1 : -1;
        const lowEdge = o.z - (sign * o.d) / 2;
        above = oy - k * sign * (oz - lowEdge) + sink;
        change = dy - k * sign * dz;
      }
      if (Math.abs(change) < 1e-9) {
        if (above > 0) return Infinity;
      } else if (change > 0) {
        span.to = Math.min(span.to, -above / change);
      } else {
        span.from = Math.max(span.from, -above / change);
      }
    }
    return span.from <= span.to ? span.from : Infinity;
  }

  /** The body of a character is an upright cylinder. */
  function rayChar(c, ox, oy, oz, dx, dy, dz) {
    const span = { from: 0, to: Infinity };
    const fx = ox - c.x;
    const fz = oz - c.z;
    const a = dx * dx + dz * dz;
    const off = fx * fx + fz * fz - PLAYER_R * PLAYER_R;
    if (a < 1e-9) {
      if (off > 0) return Infinity; // straight up or down, next to the body
    } else {
      const b = fx * dx + fz * dz;
      const disc = b * b - a * off;
      if (disc < 0) return Infinity;
      const root = Math.sqrt(disc);
      span.from = Math.max(0, (-b - root) / a);
      span.to = (-b + root) / a;
    }
    clipSlab(span, oy, dy, c.y, c.y + PLAYER_H);
    return span.from <= span.to ? span.from : Infinity;
  }

  /** Where a shot of character c ends and whom it hits (or null). */
  function castShot(c) {
    const ox = c.x;
    const oy = c.y + EYE_H;
    const oz = c.z;
    const cosPitch = Math.cos(c.pitch);
    const dx = -Math.sin(c.yaw) * cosPitch;
    const dy = Math.sin(c.pitch);
    const dz = -Math.cos(c.yaw) * cosPitch;

    // What stops the shot at the latest: sky, floor, outer walls, obstacles.
    let reach = SKY_RANGE;
    if (dy < 0) reach = Math.min(reach, -oy / dy);
    if (dx > 0) reach = Math.min(reach, (half - ox) / dx);
    if (dx < 0) reach = Math.min(reach, (-half - ox) / dx);
    if (dz > 0) reach = Math.min(reach, (half - oz) / dz);
    if (dz < 0) reach = Math.min(reach, (-half - oz) / dz);
    for (let i = 0; i < MAP.length; i++) {
      reach = Math.min(reach, rayObstacle(i, ox, oy, oz, dx, dy, dz));
    }
    // The nearest character in front of that point is hit.
    let victim = null;
    for (const other of chars) {
      if (other === c || !other.alive) continue;
      const t = rayChar(other, ox, oy, oz, dx, dy, dz);
      if (t < reach) {
        reach = t;
        victim = other;
      }
    }
    return {
      from: [round3(ox), round3(oy), round3(oz)],
      to: [round3(ox + dx * reach), round3(oy + dy * reach), round3(oz + dz * reach)],
      victim,
    };
  }

  /** Judges all shots since the last tick against the same moment. */
  function resolveShots(now) {
    const hit = [];
    for (const shot of pendingShots) {
      const c = chars.find((q) => q.alive && q.mouseId === shot.id);
      if (!c || c.reloadEnd > 0 || now < c.nextShotAt) continue;
      if (c.ammo === 0) continue; // empty: nothing happens until R is pressed
      c.ammo -= 1;
      c.nextShotAt = now + SHOT_MS;
      // The shot flies where the mouse player looked when clicking.
      c.yaw = shot.yaw;
      c.pitch = shot.pitch;
      const result = castShot(c);
      if (result.victim) hit.push(result.victim);
      broadcast({
        t: 'shot', team: c.team, from: result.from, to: result.to,
        hit: result.victim?.team ?? null,
      });
    }
    pendingShots = [];
    // Lives are taken after all shots were judged, so two characters can
    // lose their last life at the same moment (a draw).
    for (const victim of hit) victim.lives = Math.max(0, victim.lives - 1);
    for (const c of chars) if (c.alive && c.lives === 0) knockOut(c);
  }

  function sendState() {
    broadcast({
      t: 'state',
      half: round3(half),
      chars: chars
        .filter((c) => c.alive)
        .map((c) => ({
          team: c.team,
          x: round3(c.x), y: round3(c.y), z: round3(c.z),
          yaw: round3(c.yaw), pitch: round3(c.pitch),
          lives: c.lives,
          ammo: c.ammo,
          // How far the reload is, from 0 to 1; 0 when not reloading.
          reload: c.reloadEnd > 0 ? round3(1 - (c.reloadEnd - lastTick) / RELOAD_MS) : 0,
        })),
    });
  }

  /** A message from a player (over the network or from the host's own screen). */
  function handle(id, msg) {
    const p = players.find((q) => q.id === id);
    if (!p || !msg || typeof msg.t !== 'string') return;
    const inRound = phase !== 'lobby';

    if (msg.t === 'hello') {
      p.name = cleanName(msg.name) || p.name;
      if (phase === 'lobby') sendLobby();
    } else if (msg.t === 'seat' && phase === 'lobby') {
      takeSeat(p, msg.team, msg.seat);
      sendLobby();
    } else if (msg.t === 'start' && phase === 'lobby' && p.isHost) {
      if (startProblem() === '') startRound();
      else sendLobby();
    } else if (msg.t === 'keys' && inRound) {
      // Only the keyboard player of a character can move it.
      const c = chars.find((q) => q.alive && q.keyboardId === id);
      if (!c) return;
      for (const key of Object.keys(c.keys)) c.keys[key] = msg[key] === true;
    } else if (msg.t === 'look' && inRound) {
      // Only the mouse player of a character can turn its view.
      const c = chars.find((q) => q.alive && q.mouseId === id);
      if (!c || !isNumber(msg.yaw) || !isNumber(msg.pitch)) return;
      c.yaw = Math.atan2(Math.sin(msg.yaw), Math.cos(msg.yaw));
      c.pitch = clamp(msg.pitch, -MAX_PITCH, MAX_PITCH);
    } else if (msg.t === 'shot' && phase === 'fight') {
      if (!isNumber(msg.yaw) || !isNumber(msg.pitch)) return;
      pendingShots.push({
        id,
        yaw: Math.atan2(Math.sin(msg.yaw), Math.cos(msg.yaw)),
        pitch: clamp(msg.pitch, -MAX_PITCH, MAX_PITCH),
      });
    } else if (msg.t === 'reload' && phase === 'fight') {
      // Only the keyboard player reloads; a full magazine needs no reload.
      const c = chars.find((q) => q.alive && q.keyboardId === id);
      if (!c || c.reloadEnd > 0 || c.ammo === MAGAZINE) return;
      c.reloadEnd = lastTick + RELOAD_MS;
    }
  }

  /** Called many times per second with the current time in milliseconds. */
  function tick(now) {
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    if (phase === 'lobby') return;

    if (phase === 'countdown' && now >= deadline) {
      phase = 'fight';
      fightStart = now;
      broadcast({ t: 'go' });
    }
    if (phase === 'fight') {
      setWalls(arenaHalf(now - fightStart));
      for (const c of chars) {
        if (c.reloadEnd > 0 && now >= c.reloadEnd) {
          c.reloadEnd = 0;
          c.ammo = MAGAZINE;
        }
      }
      resolveShots(now);
    }

    // Small equal steps keep the collisions exact, whatever the pace.
    // During the countdown nobody walks, but everybody stands on the floor.
    const canWalk = phase !== 'countdown';
    const steps = Math.max(1, Math.ceil(dt * 60));
    for (let i = 0; i < steps; i++) {
      for (const c of chars) if (c.alive) moveChar(c, dt / steps, canWalk);
    }

    if (phase === 'fight') checkEnd(now);
    if (phase === 'winner' && now >= deadline) {
      toLobby();
      return;
    }
    if (now - lastState >= STATE_MS) {
      lastState = now;
      sendState();
    }
  }

  return { addPlayer, removePlayer, handle, tick, isFull };
}
