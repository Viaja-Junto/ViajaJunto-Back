import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export function buildCorsOptions(origins: string[]): CorsOptions {
  return {
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Disposition', 'Retry-After'],
    maxAge: 600,
  };
}
