import { env } from '@/config/env';
import {
  folderName,
  isRecord,
  readChoice,
  readDate,
  readInteger,
  readOptionalText,
  readText,
  readTextList,
} from '@/lib/content';
import { ContentError } from '@/lib/errors';
import { getSupabaseOrNull } from '@/lib/supabase';
import type { Game } from '@/types/models';

/*
 * The catalogue lives in the repository: every game folder games/<slug>/
 * has a game.json (its store entry) and optionally a description.md (the
 * long text on the game page). Vite collects these files at build time, so
 * adding a game is one commit and needs no database. Folders that start
 * with "_" (the template) are skipped.
 */
const manifests = import.meta.glob<unknown>(['/games/*/game.json', '!/games/_*/game.json'], {
  eager: true,
  import: 'default',
});

const descriptions = import.meta.glob<string>(
  ['/games/*/description.md', '!/games/_*/description.md'],
  { eager: true, query: '?raw', import: 'default' },
);

/** Shown for games that have no cover or banner yet. Lives in /public. */
const PLACEHOLDER_IMAGE = '/game-placeholder.svg';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function toGame(path: string, manifest: unknown): Game {
  const slug = folderName(path);
  const file = `games/${slug}/game.json`;

  if (!SLUG_PATTERN.test(slug)) {
    throw new ContentError(
      `games/${slug}/`,
      'Folder names may only contain lower-case letters, numbers and hyphens.',
    );
  }
  if (!isRecord(manifest)) throw new ContentError(file, 'The file must contain one { } object.');

  // Images sit in the game folder and are served from the games origin.
  const imageUrl = (name: string) => `${env.gamesBaseUrl}/${slug}/${name}`;
  const cover = readOptionalText(file, manifest, 'cover');
  const banner = readOptionalText(file, manifest, 'banner') ?? cover;
  const shortDescription = readText(file, manifest, 'shortDescription');

  return {
    // The folder name identifies the game everywhere, also in the database.
    id: slug,
    slug,
    title: readText(file, manifest, 'title'),
    shortDescription,
    description: descriptions[`/games/${slug}/description.md`]?.trim() || shortDescription,
    genres: readTextList(file, manifest, 'genres'),
    engine: readOptionalText(file, manifest, 'engine') ?? 'HTML5',
    coverUrl: cover ? imageUrl(cover) : PLACEHOLDER_IMAGE,
    bannerUrl: banner ? imageUrl(banner) : PLACEHOLDER_IMAGE,
    screenshots: readTextList(file, manifest, 'screenshots').map(imageUrl),
    gamePath: slug,
    version: readOptionalText(file, manifest, 'version') ?? '1.0.0',
    status: readChoice(file, manifest, 'status', ['draft', 'published']),
    isFeatured: manifest.featured === true,
    publishedAt: readDate(file, manifest, 'publishedAt'),
    // Filled in from the database by fetchGames().
    totalPlaytimeSeconds: 0,
    maxPlayers: readInteger(file, manifest, 'maxPlayers', { min: 1, max: 16, fallback: 1 }),
  };
}

/**
 * Total playtime per game, from the public game_stats table. Only used for
 * the "Most played" sorting, so the store keeps working without it: when
 * Supabase is not configured or not reachable, every game counts as 0.
 */
async function fetchPlaytimeTotals(): Promise<Map<string, number>> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return new Map();
  const { data, error } = await supabase.from('game_stats').select('game_slug, total_seconds');
  if (error) {
    console.warn('Playtime totals could not be loaded:', error.message);
    return new Map();
  }
  return new Map(data.map((row) => [row.game_slug, row.total_seconds]));
}

/**
 * All games that are visible in the store, newest first. Drafts only show
 * up on a developer's machine (npm run dev), never on the live site.
 */
export async function fetchGames(): Promise<Game[]> {
  const games = Object.entries(manifests)
    .map(([path, manifest]) => toGame(path, manifest))
    .filter((game) => game.status === 'published' || import.meta.env.DEV)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const totals = await fetchPlaytimeTotals();
  return games.map((game) => ({ ...game, totalPlaytimeSeconds: totals.get(game.slug) ?? 0 }));
}
