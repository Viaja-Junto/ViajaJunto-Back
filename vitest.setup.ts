process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-chars';
