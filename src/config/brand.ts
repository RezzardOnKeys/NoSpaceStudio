/**
 * Single source of truth for everything brand related.
 *
 * To rename the product, change the values here. The only other places that
 * need a manual touch are the static image files in /public (logo.svg,
 * favicon.svg) and the prose in README.md.
 */
export const brand = {
  /** Full product name, used in titles, meta tags and legal pages. */
  name: 'NoSpaceStudio',
  /** The wordmark is rendered in two weights: bold part + light part. */
  wordmark: { strong: 'NoSpace', light: 'Studio' },
  slogan: 'No downloads. No space needed.',
  description: 'Free browser games you can play instantly. No downloads. No space needed.',
  /** Paths are relative to /public. */
  logoPath: '/logo.svg',
  faviconPath: '/favicon.svg',
  // TODO: replace the placeholder once the real mailbox exists.
  contactEmail: 'contact@example.com',
  /** Browser UI colour (address bar, PWA title bar). Matches --color-canvas. */
  themeColor: '#0a0c12',
} as const;

export type Brand = typeof brand;
