import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 85,
        branches: 70,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.entity.ts',
        'src/**/domain/*.repository.ts',
        'src/shared/domain/**',
        'src/**/infrastructure/**',
        'src/shared/database/**',
      ],
    },
  },
});
