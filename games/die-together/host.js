// Die Together – the referee. Only one browser runs this: the party host.
// It owns the seats in the menu, decides when a round may start and (from
// the next step on) runs the round itself. Everybody else, including the
// host's own screen, only receives the messages sent from here.

import { MAX_PLAYERS, TEAMS, SEATS, ROUND_PLACEHOLDER_MS } from './config.js';

/**
 * expected: how many people the launcher's party has (the "players" value
 * from the address), or null if it is unknown.
 */
export function createHost({ expected }) {
  /** Everybody who is connected. team/seat are null until they sit down. */
  const players = [];
  let phase = 'lobby'; // lobby | round
  let deadline = 0;
  let lastTick = 0;
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

  function sendLobby(note) {
    broadcast({
      t: 'lobby',
      note: note || '',
      expected: people(),
      players: players.map((p) => ({ id: p.id, name: p.name, team: p.team, seat: p.seat })),
      botTeam: botTeam(),
      problem: startProblem(),
    });
  }

  /** Back to the menu. Everybody keeps their seat and may pick a new one. */
  function toLobby(note) {
    phase = 'lobby';
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
    return p.id;
  }

  function removePlayer(id) {
    const i = players.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [gone] = players.splice(i, 1);
    if (phase === 'lobby') sendLobby(`${gone.name} left the game.`);
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

  function startRound() {
    // One entry per character: the two players, or a bot.
    const teams = [];
    TEAMS.forEach((_, team) => {
      if (!teamIsUsed(team)) return;
      teams.push({
        team,
        isBot: false,
        mouse: seatOwner(team, 'mouse').name,
        keyboard: seatOwner(team, 'keyboard').name,
      });
    });
    const bot = botTeam();
    if (bot !== null) teams.push({ team: bot, isBot: true });

    phase = 'round';
    deadline = lastTick + ROUND_PLACEHOLDER_MS;
    broadcast({ t: 'round', teams, dur: ROUND_PLACEHOLDER_MS });
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
    }
  }

  /** Called many times per second with the current time in milliseconds. */
  function tick(now) {
    lastTick = now;
    if (phase === 'round' && now >= deadline) toLobby();
  }

  return { addPlayer, removePlayer, handle, tick, isFull };
}
