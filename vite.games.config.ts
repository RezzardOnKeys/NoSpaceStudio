import { defineConfig } from 'vite';

/**
 * Serves the games/ folder on its own port, so games run on a different
 * origin than the launcher. This mirrors production, where games are a
 * separate Cloudflare Pages project.
 */
export default defineConfig({
  root: 'games',
  appType: 'mpa',
  server: {
    port: 5174,
    strictPort: true,
  },
});
