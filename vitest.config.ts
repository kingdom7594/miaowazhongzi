import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Node does not report `sqlite` in module.builtinModules, so Vite cannot
      // resolve `node:sqlite`; route it through a createRequire shim.
      'node:sqlite': resolve(import.meta.dirname, 'test/node-sqlite-shim.ts'),
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
});
