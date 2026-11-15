import { brand } from '@/config/brand';
import { draftGameSlugs } from '@/features/games/api';
import { fileName, readChoice, readDate, readOptionalText, readText } from '@/lib/content';
import { ContentError } from '@/lib/errors';
import type { NewsPost } from '@/types/models';

/*
 * News posts live in the repository: one Markdown file per post in news/.
 * The block between the two "---" lines at the top holds the details
 * (title, type, date, ...), everything below it is the post itself.
 * Files that start with "_" (the template) are skipped.
 */
const files = import.meta.glob<string>(['/news/*.md', '!/news/_*.md'], {
  eager: true,
  query: '?raw',
  import: 'default',
});

const HEADER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Reads the "key: value" lines of the header block. */
function parseHeader(header: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of header.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2');
    if (key) fields[key] = value;
  }
  return fields;
}

function toNewsPost(path: string, content: string): NewsPost {
  const id = fileName(path);
  const file = `news/${id}.md`;

  const match = HEADER_PATTERN.exec(content.trimStart());
  if (!match) {
    throw new ContentError(file, 'The file must start with a details block between two --- lines.');
  }
  const fields = parseHeader(match[1] ?? '');
  const type = readChoice(file, fields, 'type', ['game_update', 'launcher_update', 'announcement']);
  const gameId = readOptionalText(file, fields, 'game');
  if (type === 'game_update' && !gameId) {
    throw new ContentError(file, 'A game_update needs "game: <folder name of the game>".');
  }

  return {
    id,
    title: readText(file, fields, 'title'),
    bodyMd: (match[2] ?? '').trim(),
    type,
    gameId,
    version: readOptionalText(file, fields, 'version'),
    publishedAt: readDate(file, fields, 'date'),
    authorName: readOptionalText(file, fields, 'author') ?? brand.name,
  };
}

/**
 * All posts, newest first. On the live site a post stays hidden while its
 * date is in the future or while the game it is about is still a draft; on
 * a developer's machine it already shows.
 */
export function fetchNews(): Promise<NewsPost[]> {
  try {
    const now = new Date().toISOString();
    const drafts = draftGameSlugs();
    const visible = (post: NewsPost) =>
      post.publishedAt <= now && !(post.gameId !== null && drafts.has(post.gameId));
    const posts = Object.entries(files)
      .map(([path, content]) => toNewsPost(path, content))
      .filter((post) => visible(post) || import.meta.env.DEV)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return Promise.resolve(posts);
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}
