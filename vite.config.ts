import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { brand } from './src/config/brand.ts';

/**
 * Replaces %BRAND_*% placeholders in index.html so the brand name lives in
 * exactly one place (src/config/brand.ts).
 */
function brandHtml(): Plugin {
  const replacements: Record<string, string> = {
    '%BRAND_NAME%': brand.name,
    '%BRAND_SLOGAN%': brand.slogan,
    '%BRAND_DESCRIPTION%': brand.description,
    '%BRAND_THEME_COLOR%': brand.themeColor,
  };

  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return Object.entries(replacements).reduce(
        (result, [placeholder, value]) => result.replaceAll(placeholder, value),
        html,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandHtml()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
