// Teleport Snipe – the referee. It runs the match: the countdown before a
// round, the players' movement (sim.js, in fixed steps), the shots with
// their teleports, the hit that ends a round, the slow motion, the round
// card and the score up to "first to 3". It exists only in one browser:
// your own in a match alone, the party host's in a party match. The
// guest's browser decides nothing that counts; it shows what the referee
// reports (guest.js). In a match alone the referee also runs the bot
// (bot.js), which plays by the same rules.
//
// A round goes: countdown (3 s) -> playing -> slowmo (1.5 s at a quarter
// of the speed after the hit) -> card (2.5 s) -> the next round's
// countdown, or ended when a player has won 3 rounds.
//
// In a party match the guest's player is moved here with the guest's own
// keys, step by step (feed.js). A shot of the guest names the step after
// which it was fired, so it is decided exactly there. It is checked
// against where the host's player was on the guest's screen at that
// moment ("lag compensation"): the referee remembers where everybody was
// during the last half second.
//
// All messages of a party match (sent in game.js):
//
//   guest -> host
//     { t: 'hello', name, color }   after connecting; color = wanted palette index
//     { t: 'color', color }         picked another colour in the menu
//     { t: 'ready', ready }         pressed "Ready"
//     { t: 'input', r, n, s }       keys of the steps n, n+1, ... of round r: s is a
//                                   list of packInput() lists (wire.js, feed.js)
//     { t: 'shot', r, n, v, ox, oy, oz, dx, dy, dz }
//                                   a shot fired after step n of round r, from the
//                                   eyes (o) in direction d; v = the host step the
//                                   guest saw the host's player at (see snapshot)
//
//   host -> guest
//     { t: 'lobby', hostName, colors, ready }   the menu; also "back to the menu"
//     { t: 'start', hostName, colors, seed }    a match begins (or goes on
//                                   after the guest reloaded); seed = the
//                                   number all teleport spots come from
//     { t: 'snap', s, cd, r, sc, k, hn, a, p, ev }
//                                   the state of the match, see snapshot() below
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG, MAX_PLAYERS, STEP } from './config.js';
import { startOf } from './map.js';
import {
  createPlayer,
  placePlayer,
  movePlayer,
  resolveShot,
  eyeOf,
} from './sim.js';
import { packPlayer, packPoint, unpackShot } from './wire.js';
import { Bot } from './bot.js';

// How far back a guest's shot may look (steps of the rules: half a second).
const REWIND = 30;
// A guest's shot must start at most this far from where the host has the
// guest's eyes (metres); otherwise the host's place is used.
const ORIGIN_SLACK = 2.5;

/**
 * localSeats: the seats whose keys are read in this browser.
 * feed: the guest's keys (feed.js) in a party match, or null.
 * botSeats: the seats played by the bot (a match alone).
 */
export function createReferee({ localSeats, feed = null, botSeats = [] }) {
  let stepTime = 0; // time not yet used up by whole steps of the rules
  let timer = 0; // seconds left in the slow motion or of the round card
  let history = []; // per step: { n, at: [{ x, y, z, crouching }, ...] }
  let pending = []; // guest shots that wait for their step: { seat, n, v, shot }
  let netEvents = []; // shots and teleports since the last snapshot (for the guest)

  const ref = {
    state: 'menu', // menu | countdown | playing | slowmo | card | ended
    round: 1, // the round being played (1, 2, 3, ...)
    countdown: 0, // seconds left before the round starts
    scores: [0, 0], // won rounds per seat
    seed: 1, // the number all teleport spots of this match come from
    kill: null, // the hit that ended the last round: { victim, shooter }
    hostStep: 0, // steps of the rules played in this match
    remoteSeat: -1, // the seat moved by the guest's keys (-1: none connected)
    players: Array.from({ length: MAX_PLAYERS }, (_, seat) => createPlayer(seat)),
    bots: [], // { seat, bot } for every seat in botSeats
    // What happened since game.js last looked:
    //   { type: 'teleport', seat, n, from, to }
    //   { type: 'shot', seat, from, to, hit }
    events: [],
    /** How far the picture is between the last two steps of the rules (0..1). */
    get between() {
      return ref.state === 'playing' || ref.state === 'slowmo' ? stepTime / STEP : 1;
    },
    /** How fast the game runs right now (a quarter in slow motion). */
    get speed() {
      return ref.state === 'slowmo' ? CONFIG.match.slowmoSpeed : 1;
    },

    /** Starts a new match with round 1; seed: see random.js. */
    start(seed) {
      ref.seed = seed;
      ref.round = 1;
      ref.scores = new Array(MAX_PLAYERS).fill(0);
      ref.hostStep = 0;
      for (const p of ref.players) p.shots = 0;
      // The bot duels the first player who is not a bot.
      const human = ref.players.find((p) => !botSeats.includes(p.seat));
      ref.bots = botSeats.map((seat) => ({ seat, bot: new Bot(ref.players[seat], human) }));
      ref.beginRound();
    },

    /** Everybody back to their start points, then the countdown. */
    beginRound() {
      for (const p of ref.players) placePlayer(p, startOf(p.seat, ref.round));
      ref.countdown = CONFIG.match.countdown;
      ref.kill = null;
      stepTime = 0;
      history = [];
      pending = [];
      if (feed) feed.reset();
      for (const b of ref.bots) b.bot.reset();
      ref.state = 'countdown';
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        // Nobody can move yet, but everybody may already look around.
        for (const p of ref.players) p.yaw = p.input.yaw;
        ref.countdown -= dt;
        if (ref.countdown <= 0) {
          ref.countdown = 0;
          ref.state = 'playing';
        }
      } else if (ref.state === 'playing' || ref.state === 'slowmo') {
        stepTime += dt * ref.speed;
        while (stepTime >= STEP) {
          stepTime -= STEP;
          playStep();
        }
        if (ref.state === 'slowmo') {
          timer -= dt;
          if (timer <= 0) {
            ref.state = 'card';
            timer = CONFIG.match.cardTime;
          }
        }
      } else if (ref.state === 'card') {
        timer -= dt;
        if (timer <= 0) {
          if (Math.max(...ref.scores) >= CONFIG.match.roundsToWin) {
            ref.state = 'ended';
          } else {
            ref.round += 1;
            ref.beginRound();
          }
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
    },

    /** A shot of a player in this browser (see resolveShot in sim.js). */
    shoot(seat, shot) {
      if (ref.state !== 'playing') return null;
      return decide(seat, shot);
    },

    /** A shot message from the guest (see the list of messages above). */
    remoteShot(seat, msg) {
      if (ref.state !== 'playing' || msg.r !== ref.round || !Number.isInteger(msg.n)) return;
      const shot = unpackShot(msg);
      if (!shot) return;
      const v = Number.isFinite(msg.v) ? msg.v : ref.hostStep;
      if (feed && feed.ack >= msg.n) decideRemote(seat, v, shot);
      else if (pending.length < 8) pending.push({ seat, n: msg.n, v, shot });
    },

    /**
     * The state of the match for the guest.
     * k: the hit that ended the round as [victim, shooter], or null;
     * hn: the host's step; a: the guest's last step that was played (feed.js);
     * p: every player packed by packPlayer(); ev: shots ['s', seat, from, to]
     * and teleports ['t', seat, n, from, to] since the last snapshot.
     */
    snapshot() {
      const msg = {
        t: 'snap',
        s: ref.state,
        cd: Math.round(ref.countdown * 1000) / 1000,
        r: ref.round,
        sc: ref.scores,
        k: ref.kill ? [ref.kill.victim, ref.kill.shooter] : null,
        hn: ref.hostStep,
        a: feed ? feed.ack : -1,
        p: ref.players.map(packPlayer),
        ev: netEvents,
      };
      netEvents = [];
      return msg;
    },
  };

  /** One step of the rules for everybody. */
  function playStep() {
    for (const seat of localSeats) {
      const p = ref.players[seat];
      if (p.alive) movePlayer(p, STEP);
    }
    for (const { seat, bot } of ref.bots) {
      const p = ref.players[seat];
      const shot = bot.think(STEP);
      if (shot && ref.state === 'playing') decide(seat, shot);
      if (p.alive) movePlayer(p, STEP);
    }
    if (feed && ref.remoteSeat >= 0) {
      feed.play(ref.players[ref.remoteSeat], (seq) => {
        // The guest's shots fired after this step are decided now.
        const ready = pending.filter((s) => s.n <= seq);
        pending = pending.filter((s) => s.n > seq);
        for (const s of ready) if (ref.state === 'playing') decideRemote(s.seat, s.v, s.shot);
      });
    }
    ref.hostStep += 1;
    history.push({
      n: ref.hostStep,
      at: ref.players.map((p) => ({ x: p.x, y: p.y, z: p.z, crouching: p.crouching })),
    });
    if (history.length > REWIND + 2) history.shift();
  }

  /** Decides a shot and everything that follows: the round's end or the teleport. */
  function decide(seat, shot) {
    const out = resolveShot(ref.seed, ref.players[seat], shot, ref.players);
    if (!out) return null;
    const from = { x: shot.ox, y: shot.oy, z: shot.oz };
    const to = { x: out.result.x, y: out.result.y, z: out.result.z };
    ref.events.push({ type: 'shot', seat, from, to, hit: out.result.target !== null });
    netEvents.push(['s', seat, packPoint(from), packPoint(to)]);
    if (out.victim >= 0) {
      ref.players[out.victim].alive = false;
      ref.scores[seat] += 1;
      ref.kill = { victim: out.victim, shooter: seat };
      ref.state = 'slowmo';
      timer = CONFIG.match.slowmo;
    } else {
      const n = ref.players[seat].shots;
      ref.events.push({ type: 'teleport', seat, n, from: out.from, to: out.to });
      // A bot sees the flash where the other player landed, like a person would;
      // a bot that teleported itself looks for new cover.
      for (const b of ref.bots) {
        if (b.seat !== seat) b.bot.noticeFlash(out.to);
        else b.bot.goal = null;
      }
      netEvents.push(['t', seat, n, packPoint(out.from), packPoint(out.to)]);
    }
    return out;
  }

  /**
   * A shot of the guest: the other players are put back for a moment to
   * where they were at host step v (as the guest saw them), the shot is
   * decided, then everything is put back in place.
   */
  function decideRemote(seat, v, shot) {
    const shooter = ref.players[seat];
    // The rifle was loaded on the guest's screen; small timing differences are forgiven.
    if (shooter.reload <= 0.05) shooter.reload = 0;
    const ex = shooter.x;
    const ey = eyeOf(shooter);
    const ez = shooter.z;
    if (Math.hypot(shot.ox - ex, shot.oy - ey, shot.oz - ez) > ORIGIN_SLACK) {
      shot.ox = ex;
      shot.oy = ey;
      shot.oz = ez;
    }
    const want = Math.max(ref.hostStep - REWIND, Math.min(ref.hostStep, v));
    const past = history.find((h) => h.n >= want) || null;
    const saved = ref.players.map((p) => ({ x: p.x, y: p.y, z: p.z, crouching: p.crouching }));
    if (past) {
      ref.players.forEach((p, i) => {
        if (i !== seat) Object.assign(p, past.at[i]);
      });
    }
    decide(seat, shot);
    ref.players.forEach((p, i) => {
      if (i !== seat) Object.assign(p, saved[i]);
    });
  }

  return ref;
}
