import type { Game } from '@/types/models';

/**
 * The catalogue starts empty. Until games are stored in the database and
 * managed through the admin panel, an entry can be added here by hand: put
 * the game into games/<slug>/ and add an object of type `Game` to this list.
 */
export const mockGames: Game[] = [];
