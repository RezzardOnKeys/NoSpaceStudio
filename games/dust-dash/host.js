// Dust Dash – the referee. It runs the match: countdown, clock, the rules
// (sim.js) with the dirt, the scores, the deliveries and the power-ups, and
// the bot (bot.js) in a match alone. It exists only in one browser: your own in a match
// alone, the party host's in a party match. The guest's browser decides
// nothing that counts: it moves its own character ahead with the same
// rules so it reacts at once, sends its keys (feed.js) and is corrected
// softly by what the referee reports (guest.js). Who got which piece of
// dirt, the scores, the boxes and the power-ups are decided here only, so
// two screens can never disagree about the score.
//
// All messages of a party match (sent in game.js):
//
//   guest -> host
//     { t: 'hello', name, color }   after connecting; color = wanted palette index
//     { t: 'color', color }         picked another colour in the menu
//     { t: 'ready', ready }         pressed "Ready"
//     { t: 'input', n, s }          keys of the steps n, n+1, ...: s is a list
//                                   of packInput() lists (wire.js, feed.js)
//
//   host -> guest
//     { t: 'lobby', hostName, colors, ready }   the menu; also "back to the menu"
//     { t: 'start', hostName, colors, seed }   a match begins (or goes on after a
//                                   reload); seed = the number the dirt is laid out from
//     { t: 'dirt', gone }           all pieces that are already gone, packed with
//                                   packIds(); for a guest who joins late or reloads
//     { t: 'snap', ... }            the state of the match, see snapshot() below
//     { t: 'end', sc }              time is up; sc = the scores of all players
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG, STEP } from './config.js';
import { Bot } from './bot.js';
import { packPlayer, packDelivery, packIds } from './wire.js';

/** beforeStep() is called before every step of the rules (party host: the guest's keys). */
export function createReferee({ sim, beforeStep = () => {} }) {
  let stepTime = 0; // time not yet used up by whole steps of the rules
  let bots = [];

  const ref = {
    state: 'menu', // menu | countdown | playing | ended
    timeLeft: 0,
    countdown: 0,
    seed: 1, // the number this match's dirt was laid out from
    /** One number per player, in the order of the seats. */
    get scores() {
      return sim.players.map((p) => p.score);
    },
    /** How far the picture is between the last two steps of the rules (0..1). */
    get between() {
      return ref.state === 'playing' ? stepTime / STEP : 1;
    },

    /**
     * Starts a match for this many players (people and bots together) with
     * dirt laid out from `seed`. botSeats lists the seats played by a bot.
     */
    start(playerCount, seed, botSeats = []) {
      ref.seed = seed;
      sim.reset(seed);
      for (let seat = 0; seat < playerCount; seat++) sim.addPlayer(seat);
      bots = botSeats.map((seat) => new Bot(sim.players[seat], sim, sim.nav));
      ref.timeLeft = CONFIG.match.duration;
      ref.countdown = CONFIG.match.countdown;
      stepTime = 0;
      ref.state = 'countdown';
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        ref.countdown -= dt;
        // Nobody can walk yet, but everybody may already look around.
        for (const p of sim.players) p.yaw = p.input.yaw;
        if (ref.countdown <= 0) ref.state = 'playing';
      } else if (ref.state === 'playing') {
        ref.timeLeft -= dt;
        stepTime += dt;
        while (stepTime >= STEP) {
          beforeStep();
          for (const b of bots) b.think(STEP);
          for (const p of sim.players) if (!p.external) sim.updatePlayer(p, STEP);
          sim.updateWorld(STEP);
          stepTime -= STEP;
        }
        if (ref.timeLeft <= 0) {
          ref.timeLeft = 0;
          ref.state = 'ended';
        }
      }
    },

    toMenu() {
      ref.state = 'menu';
    },

    /**
     * The state of the match for the guest.
     * removed: for every seat the pieces that player got since the last
     * snapshot; opened: the boxes opened since then as [seat, power, x, z];
     * ack: the guest's last step that was played (feed.js).
     */
    snapshot(removed, opened, ack) {
      return {
        t: 'snap',
        s: ref.state,
        tl: ref.timeLeft,
        cd: ref.countdown,
        p: sim.players.map(packPlayer),
        d: packDelivery(sim.delivery),
        rm: removed.map(packIds),
        ev: opened,
        k: ack,
      };
    },
  };
  return ref;
}
