import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';
import { env } from './shared/config/env.js';
import { configureHttp } from './shared/http/configure-http.js';
import { createOpenApiDocument } from './shared/http/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureHttp(app);

  app.use(
    `/${env.SWAGGER_PATH}`,
    apiReference({ spec: { content: createOpenApiDocument(app) } }),
  );

  await app.listen(env.PORT);
}

await bootstrap();
