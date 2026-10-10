import { createRequire } from 'node:module';

// Node's `module.builtinModules` does not list `sqlite`, so Vite/Vitest's
// resolver refuses `node:sqlite`. This shim is aliased in vitest.config.ts to
// load the real builtin at runtime. Kept untyped (test-only) on purpose.
const nodeRequire = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DatabaseSync: any = nodeRequire('node:sqlite').DatabaseSync;
