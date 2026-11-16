// Inkwars – the referee. It runs the match: countdown, clock, the rules
// (sim.js) and the bots. It exists only in one browser: your own in a solo
// match, the party host's in a party match. The guest's browser decides
// nothing: it moves its own character ahead with the same rules so it
// reacts at once, sends its keys (feed.js) and is corrected softly by what
// the referee reports (guest.js). Shots, hits, life, tank and paint are
// decided here only, so two screens can never disagree about a hit or the
// score.
//
// All messages of a party match (sent in game.js):
//
//   guest -> host
//     { t: 'hello', name, color }   after connecting; color = wanted palette index
//     { t: 'color', color }         picked another colour in the menu
//     { t: 'ready', ready }         pressed "Ready"
//     { t: 'input', n, s }          keys and aim of the steps n, n+1, ...: s is a
//                                   list of packInput() lists (wire.js, feed.js)
//
//   host -> guest
//     { t: 'lobby', hostName, colors, ready }   the menu; also "back to the menu"
//     { t: 'start', colors }        a match begins (or goes on after a reload)
//     { t: 'paint', mask }          the whole colour mask, for a guest who joins late
//     { t: 'snap', ... }            the state of the match, see snapshot() below;
//                                   k = the guest's last step played (feed.js)
//     { t: 'end', pct }             time is up; pct = painted share of team 1 and 2
//     { t: 'full' }                 a third player tried to join (handled in net.js)
//     plus 'ping' and 'bye' from net.js

import { CONFIG, STEP } from './config.js';
import { Bot } from './bots.js';
import { packActor } from './wire.js';

/** beforeStep() is called before every step of the rules (party host: the guest's keys). */
export function createReferee({ sim, paint, nav, beforeStep = () => {} }) {
  let bots = [];
  let humans = [];
  let acc = 0;

  const ref = {
    state: 'menu', // menu | countdown | playing | ended
    timeLeft: 0,
    countdown: 0,

    /**
     * Starts a match with teamSize characters per team. humanSeats lists the
     * seats taken by people as [team, slot]; every other seat gets a bot.
     * Returns the characters of the people, in the same order.
     */
    start(teamSize, humanSeats) {
      sim.actors = [];
      sim.projectiles = [];
      sim.drips = [];
      sim.events = [];
      paint.reset();
      bots = [];
      humans = [];
      for (let slot = 0; slot < teamSize; slot++) {
        for (const team of [1, 2]) {
          const seat = humanSeats.findIndex((s) => s[0] === team && s[1] === slot);
          const actor = sim.addActor(team, slot, seat < 0);
          if (seat < 0) bots.push(new Bot(actor, sim, nav));
          else humans[seat] = actor;
        }
      }
      ref.timeLeft = CONFIG.match.duration;
      ref.countdown = CONFIG.match.countdown;
      acc = 0;
      ref.state = 'countdown';
      return humans;
    },

    /** Moves the match on by dt seconds. */
    step(dt) {
      if (ref.state === 'countdown') {
        ref.countdown -= dt;
        // Nobody can walk yet, but everybody may already look around.
        for (const a of humans) a.yaw = a.input.aimYaw;
        if (ref.countdown <= 0) ref.state = 'playing';
      } else if (ref.state === 'playing') {
        ref.timeLeft -= dt;
        acc += dt;
        while (acc >= STEP) {
          for (const b of bots) b.think(STEP);
          beforeStep();
          sim.step(STEP);
          acc -= STEP;
        }
        if (ref.timeLeft <= 0) {
          ref.state = 'ended';
          sim.projectiles = [];
          sim.drips = [];
        }
      }
    },

    /** Back to the menu; the painted arena stays as a backdrop. */
    toMenu() {
      ref.state = 'menu';
      sim.projectiles = [];
      sim.drips = [];
    },

    /**
     * The state of the match for the guest. ops are the splats and shots the
     * new water drops since the last snapshot (both lists are emptied here);
     * events are hits and deaths as [kind, x, y, z, team], kind 0 = hit.
     * ht is the clock of the rules in milliseconds; the guest sends back
     * which moment of it its screen showed (see REWIND_MAX in config.js).
     */
    snapshot(events) {
      return {
        t: 'snap',
        s: ref.state,
        tl: ref.timeLeft,
        cd: ref.countdown,
        ht: Math.round(sim.time * 1000),
        a: sim.actors.map(packActor),
        ops: paint.log ? paint.log.splice(0) : [],
        shots: sim.shots ? sim.shots.splice(0) : [],
        ev: events,
      };
    },
  };
  return ref;
}
