import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../../src/app.module.js';
import { PrismaService } from './../../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../../src/shared/http/validation.js';

type Verb = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** supertest calls under the API prefix. */
export interface Caller {
  get: (path: string) => request.Test;
  post: (path: string, body?: object) => request.Test;
  patch: (path: string, body?: object) => request.Test;
  put: (path: string, body?: object) => request.Test;
  delete: (path: string) => request.Test;
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  anonymous: Caller;
  close: () => Promise<void>;
}

/** Boots the whole application against the test database, configured like the running API. */
export async function startApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(buildValidationPipe());
  await app.init();

  const callerFor = (token?: string): Caller => {
    const call = (verb: Verb, path: string, body?: object) => {
      const req = request(app.getHttpServer())[verb](`/api${path}`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return body === undefined ? req : req.send(body);
    };

    return {
      get: (path) => call('get', path),
      post: (path, body) => call('post', path, body ?? {}),
      patch: (path, body) => call('patch', path, body ?? {}),
      put: (path, body) => call('put', path, body ?? {}),
      delete: (path) => call('delete', path),
    };
  };

  return {
    app,
    prisma: app.get(PrismaService),
    anonymous: callerFor(),
    close: () => app.close(),
  };
}
