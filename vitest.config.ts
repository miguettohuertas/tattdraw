import { defineConfig } from 'vitest/config';

// Os testes ficam ao lado do código, com o sufixo .test.ts.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
  },
});
