import type { NestExpressApplication } from '@nestjs/platform-express';
import { env } from '@shared/config/env.js';
import { buildCorsOptions } from './cors.js';
import { securityHeaders } from './security.js';
import { buildValidationPipe } from './validation.js';

export function configureHttp(app: NestExpressApplication): void {
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }

  app.use(securityHeaders(env.SWAGGER_PATH, env.SWAGGER_UI_PATH));
  app.setGlobalPrefix(env.API_PREFIX);
  app.enableCors(buildCorsOptions(env.CORS_ORIGINS));
  app.useGlobalPipes(buildValidationPipe());
}
