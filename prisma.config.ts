import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// process.env, not env(): `prisma generate` runs in docker build and CI without a database.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
