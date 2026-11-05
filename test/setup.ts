/**
 * src/shared/config/env.ts validates the environment at import time, so every
 * spec that imports it transitively needs these. The unit suite never connects.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';
// The e2e suites fire hundreds of requests from one address.
process.env.THROTTLE_LIMIT ??= '100000';
process.env.THROTTLE_WRITE_LIMIT ??= '100000';
process.env.THROTTLE_STRICT_LIMIT ??= '100000';
