import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  test: { environment: 'jsdom' },
});
