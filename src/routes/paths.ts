/** All route paths in one place, so links never contain hand-typed URLs. */
export const paths = {
  store: '/',
  game: (slug: string) => `/games/${slug}`,
  play: (slug: string) => `/play/${slug}`,
  library: '/library',
  friends: '/friends',
  news: '/news',
  profile: '/profile',
  user: (username: string) => `/u/${username}`,
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  imprint: '/imprint',
  privacy: '/privacy',
  uiKit: '/dev/ui',
} as const;
