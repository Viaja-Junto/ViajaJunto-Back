/**
 * Exports the OpenAPI document so CI can lint it with Spectral.
 *
 * Built from the real AppModule with PrismaService stubbed, so no database is
 * needed. Run `npm run build` first: this reads from dist/.
 *
 * Usage: node scripts/generate-openapi.mjs [output-path]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/viajajunto?schema=public';
process.env.JWT_SECRET ??= 'openapi-export-placeholder-secret-32+';

const { Test } = await import('@nestjs/testing');
const { AppModule } = await import('../dist/app.module.js');
const { PrismaService } = await import('../dist/shared/database/prisma.service.js');
const { createOpenApiDocument } = await import('../dist/shared/http/openapi.js');
const { configureHttp } = await import('../dist/shared/http/configure-http.js');

const output = resolve(process.argv[2] ?? 'openapi.json');

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaService)
  .useValue({ $connect: async () => {}, $disconnect: async () => {} })
  .compile();

const app = moduleRef.createNestApplication({ logger: false });
configureHttp(app);
await app.init();

const document = createOpenApiDocument(app);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);

await app.close();

console.log(
  `OpenAPI written to ${output} — ${Object.keys(document.paths).length} paths, ` +
    `${Object.keys(document.components?.schemas ?? {}).length} schemas`,
);
