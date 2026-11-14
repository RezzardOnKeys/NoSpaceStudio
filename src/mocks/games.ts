import type { Game } from '@/types/models';

import { createArt, type ArtStyle } from './art';

/** Folder of the starter template. Mock entries without a real game use it. */
const TEMPLATE_PATH = '_template';

interface GameSeed extends Omit<Game, 'coverUrl' | 'bannerUrl' | 'screenshots' | 'status'> {
  art: ArtStyle;
}

const seeds: GameSeed[] = [
  {
    id: 'game-star-dodger',
    slug: 'star-dodger',
    title: 'Star Dodger',
    shortDescription: 'Weave through an endless asteroid field. How long can you survive?',
    description:
      'Your ship is fast, the asteroid field is faster. **Star Dodger** is a pure reflex game: steer left and right, slip through the gaps and hold on as the field speeds up.\n\n- Play with the arrow keys, A/D, mouse or touch\n- The speed rises the longer you survive\n- Your best time is saved in your browser',
    genres: ['Arcade', 'Action'],
    engine: 'HTML5',
    gamePath: 'star-dodger',
    version: '1.2.0',
    isFeatured: true,
    publishedAt: '2026-11-02T10:00:00Z',
    totalPlaytimeSeconds: 412_000,
    art: { from: '#1b1464', to: '#0b0d2a', glow: '#7c5cff', motif: 'orbs' },
  },
  {
    id: 'game-tile-shift',
    slug: 'tile-shift',
    title: 'Tile Shift',
    shortDescription: 'The classic sliding puzzle. Put fifteen tiles back in order.',
    description:
      'Fifteen tiles, one gap. Slide the tiles until they are back in order, in as few moves as you can.\n\n- Click a tile or use the arrow keys\n- Every shuffle is solvable\n- Tracks your moves and time',
    genres: ['Puzzle', 'Casual'],
    engine: 'HTML5',
    gamePath: 'tile-shift',
    version: '1.0.1',
    isFeatured: false,
    publishedAt: '2026-10-21T10:00:00Z',
    totalPlaytimeSeconds: 268_000,
    art: { from: '#0e4d64', to: '#0a1a2e', glow: '#3ecfcf', motif: 'grid' },
  },
  {
    id: 'game-neon-drift',
    slug: 'neon-drift',
    title: 'Neon Drift',
    shortDescription: 'Slide through a glowing city at midnight and chase the perfect line.',
    description:
      'Rain on the asphalt, neon in the puddles. **Neon Drift** is an arcade racer about holding a drift for as long as you dare.\n\nChain drifts to build your multiplier, shave seconds off your lap and climb the board.',
    genres: ['Racing', 'Arcade'],
    engine: 'Unity',
    gamePath: TEMPLATE_PATH,
    version: '0.9.3',
    isFeatured: true,
    publishedAt: '2026-11-10T10:00:00Z',
    totalPlaytimeSeconds: 655_000,
    art: { from: '#5b0f6b', to: '#12092b', glow: '#ff4fa3', motif: 'rays' },
  },
  {
    id: 'game-dungeon-of-echoes',
    slug: 'dungeon-of-echoes',
    title: 'Dungeon of Echoes',
    shortDescription: 'A turn-based crawl where every room remembers what you did.',
    description:
      'Every step echoes. Enemies learn your habits, so the trick that saved you on floor two will get you killed on floor five.\n\nA compact roguelike with short runs and a lot of secrets.',
    genres: ['RPG', 'Adventure'],
    engine: 'Godot',
    gamePath: TEMPLATE_PATH,
    version: '0.4.0',
    isFeatured: false,
    publishedAt: '2026-09-30T10:00:00Z',
    totalPlaytimeSeconds: 530_000,
    art: { from: '#3a2412', to: '#120c0a', glow: '#f5a544', motif: 'blocks' },
  },
  {
    id: 'game-cloud-kingdom',
    slug: 'cloud-kingdom',
    title: 'Cloud Kingdom',
    shortDescription: 'Hop across floating islands in a bright, breezy platformer.',
    description:
      'A kingdom drifted apart, one island at a time. Jump, glide and bounce your way across the sky to bring it back together.\n\nForty hand-built levels, no timers, no pressure.',
    genres: ['Platformer', 'Adventure'],
    engine: 'Godot',
    gamePath: TEMPLATE_PATH,
    version: '1.1.0',
    isFeatured: false,
    publishedAt: '2026-08-18T10:00:00Z',
    totalPlaytimeSeconds: 348_000,
    art: { from: '#2b6fd6', to: '#122a5c', glow: '#9fd8ff', motif: 'waves' },
  },
  {
    id: 'game-circuit-breaker',
    slug: 'circuit-breaker',
    title: 'Circuit Breaker',
    shortDescription: 'Rotate the wires, close the loop, light up the board.',
    description:
      'A calm logic puzzle. Rotate the pieces until the current reaches every lamp. One hundred boards, from a quick warm-up to proper head-scratchers.',
    genres: ['Puzzle', 'Strategy'],
    engine: 'HTML5',
    gamePath: TEMPLATE_PATH,
    version: '1.3.2',
    isFeatured: false,
    publishedAt: '2026-07-05T10:00:00Z',
    totalPlaytimeSeconds: 190_000,
    art: { from: '#0f5132', to: '#07201a', glow: '#3ecf8e', motif: 'grid' },
  },
  {
    id: 'game-moonbase-tycoon',
    slug: 'moonbase-tycoon',
    title: 'Moonbase Tycoon',
    shortDescription: 'Build a lunar colony that pays for itself before the air runs out.',
    description:
      'Oxygen, power, people. Balance all three while you grow a handful of modules into a thriving base.\n\nA management game for a lunch break or a whole evening.',
    genres: ['Simulation', 'Strategy'],
    engine: 'Unity',
    gamePath: TEMPLATE_PATH,
    version: '0.7.1',
    isFeatured: false,
    publishedAt: '2026-10-08T10:00:00Z',
    totalPlaytimeSeconds: 476_000,
    art: { from: '#39415c', to: '#0d1020', glow: '#c8d1f0', motif: 'orbs' },
  },
  {
    id: 'game-pixel-pitch',
    slug: 'pixel-pitch',
    title: 'Pixel Pitch',
    shortDescription: 'Three-a-side football with big pixels and bigger goals.',
    description:
      'Fast matches, simple controls, ridiculous goals. Play a quick cup against the computer and try to keep a clean sheet.',
    genres: ['Sports', 'Casual'],
    engine: 'HTML5',
    gamePath: TEMPLATE_PATH,
    version: '1.0.0',
    isFeatured: false,
    publishedAt: '2026-06-12T10:00:00Z',
    totalPlaytimeSeconds: 122_000,
    art: { from: '#8a2b1a', to: '#2a0f0c', glow: '#ff8a4f', motif: 'blocks' },
  },
];

export const mockGames: Game[] = seeds.map(({ art, ...game }, index) => {
  const seed = (index + 1) * 97;
  return {
    ...game,
    status: 'published',
    coverUrl: createArt(art, 'cover', seed),
    bannerUrl: createArt(art, 'banner', seed + 1),
    screenshots: [2, 3, 4].map((offset) => createArt(art, 'banner', seed + offset)),
  };
});
