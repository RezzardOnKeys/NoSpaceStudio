// Blind Drop – the practice bot. Deliberately simple: it wanders around and
// drops its bomb at a random moment, often near where it last saw a human.
// The referee (host.js) calls these functions; `world` is what the bot may
// know: { players, radius, blastR, mode, now }.

import { SPEED, PLAYER_R, clampToIsland } from './config.js';

/** A random point on a disc around the middle of the island. */
function randomSpot(maxRadius) {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * Math.max(maxRadius, 0);
  return { x: Math.cos(a) * d, z: Math.sin(a) * d };
}

/** Called when the action phase starts: where to bomb, when, where to walk. */
export function planBot(bot, world) {
  const humans = world.players.filter((p) => !p.isBot);
  // In Snipe the blast is tiny, so the bot goes for the human more often.
  const sniping = world.mode === 'snipe';
  let bombSpot = randomSpot(world.radius);
  if (humans.length > 0 && Math.random() < (sniping ? 0.9 : 0.65)) {
    const victim = humans[Math.floor(Math.random() * humans.length)];
    // The smaller the blast, the closer it aims at where the human stood.
    const miss = randomSpot(Math.max(2.5, world.blastR * 1.8));
    bombSpot = clampToIsland(victim.startX + miss.x, victim.startZ + miss.z, world.radius);
  }
  bot.ai = {
    target: randomSpot(world.radius - PLAYER_R),
    bombAt: world.now + 500 + Math.random() * 3500,
    bombSpot,
  };
}

/** Called every tick of the action phase: drop the bomb, keep walking. */
export function moveBot(bot, dt, world) {
  const ai = bot.ai;
  if (!ai) return;
  if (!bot.bomb && world.now >= ai.bombAt) bot.bomb = ai.bombSpot;
  const dx = ai.target.x - bot.x;
  const dz = ai.target.z - bot.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.2) {
    // Pick the next spot; usually one outside of its own blast.
    for (let i = 0; i < 8; i++) {
      ai.target = randomSpot(world.radius - PLAYER_R);
      const safe = !bot.bomb ||
        Math.hypot(ai.target.x - bot.bomb.x, ai.target.z - bot.bomb.z) > world.blastR + 0.6;
      if (safe || Math.random() < 0.15) break;
    }
    return;
  }
  const step = Math.min(d, SPEED * 0.9 * dt);
  const pos = clampToIsland(
    bot.x + (dx / d) * step, bot.z + (dz / d) * step, world.radius, PLAYER_R,
  );
  bot.x = pos.x;
  bot.z = pos.z;
}
