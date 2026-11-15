// Die Together – shared numbers and colours.
// Everything that defines the rules lives here, so it is easy to tune.

/** The party limit of the launcher: 4 characters with 2 players each. */
export const MAX_PLAYERS = 8;

/** The characters ("teams" in the menu). Each one is steered by two players. */
export const TEAMS = [
  { name: 'Red', hex: '#ff4b4b' },
  { name: 'Blue', hex: '#3f82ff' },
  { name: 'Yellow', hex: '#ffd23a' },
  { name: 'Green', hex: '#3fd16a' },
];

/** The two seats of a character and what the menu calls them. */
export const SEATS = [
  { id: 'mouse', label: 'Mouse', icon: '🖱️', does: 'look, aim, shoot' },
  { id: 'keyboard', label: 'Keyboard', icon: '⌨️', does: 'walk, jump, reload' },
];

/** How long the placeholder round lasts until the arena is built (milliseconds). */
export const ROUND_PLACEHOLDER_MS = 4000;
