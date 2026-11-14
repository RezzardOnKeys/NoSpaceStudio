import type { NewsPost } from '@/types/models';

export const mockNews: NewsPost[] = [
  {
    id: 'news-1',
    title: 'Neon Drift 0.9.3: the harbour district opens',
    type: 'game_update',
    gameId: 'game-neon-drift',
    version: '0.9.3',
    publishedAt: '2026-11-12T16:00:00Z',
    authorName: 'pixel_pilot',
    bodyMd:
      'A new district, a new track and a lot of small fixes.\n\n### New\n- **Harbour circuit** with two long drift corners\n- Ghost car of your best lap\n\n### Fixed\n- The multiplier no longer resets when you brush a wall\n- Smoother camera at low frame rates',
  },
  {
    id: 'news-2',
    title: 'Welcome to the prototype',
    type: 'announcement',
    gameId: null,
    version: null,
    publishedAt: '2026-11-10T09:00:00Z',
    authorName: 'pixel_pilot',
    bodyMd:
      'This is the very first version of our launcher. Everything here runs in your browser: **no downloads, no installs**.\n\nWe will add our games one by one. Tell us what you think!',
  },
  {
    id: 'news-3',
    title: 'Launcher 0.2: store filters and a new look',
    type: 'launcher_update',
    gameId: null,
    version: '0.2.0',
    publishedAt: '2026-11-08T12:00:00Z',
    authorName: 'rex_on_keys',
    bodyMd:
      '- Filter the store by **genre** and **engine**\n- Sort by newest, A–Z or most played\n- Press `/` anywhere to jump to the search',
  },
  {
    id: 'news-4',
    title: 'Star Dodger 1.2.0: touch controls',
    type: 'game_update',
    gameId: 'game-star-dodger',
    version: '1.2.0',
    publishedAt: '2026-11-02T10:00:00Z',
    authorName: 'pixel_pilot',
    bodyMd:
      'Star Dodger now plays well on phones and tablets.\n\n- Drag anywhere to steer\n- The field scales with your screen size\n- Best time is saved between sessions',
  },
  {
    id: 'news-5',
    title: 'Tile Shift 1.0.1: keyboard support',
    type: 'game_update',
    gameId: 'game-tile-shift',
    version: '1.0.1',
    publishedAt: '2026-10-24T10:00:00Z',
    authorName: 'rex_on_keys',
    bodyMd: '- Move tiles with the arrow keys\n- Fixed a rare unsolvable shuffle',
  },
  {
    id: 'news-6',
    title: 'Star Dodger 1.1.0: difficulty curve',
    type: 'game_update',
    gameId: 'game-star-dodger',
    version: '1.1.0',
    publishedAt: '2026-10-12T10:00:00Z',
    authorName: 'pixel_pilot',
    bodyMd: 'The first thirty seconds are gentler now, the rest is not.',
  },
];
