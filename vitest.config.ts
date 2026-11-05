import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
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
        // Interfaces and abstract contracts have no executable statements.
        'src/**/*.entity.ts',
        'src/**/domain/*.repository.ts',
        'src/shared/domain/**',
        // Adapters that only make sense against a real database: covered by e2e.
        'src/**/infrastructure/**',
        'src/shared/database/**',
      ],
    },
  },
});
