import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * The URL is read with process.env rather than Prisma's env() helper: env()
 * throws when the variable is missing, but `prisma generate` never connects and
 * runs from the postinstall hook inside `docker build` and in CI jobs without a
 * database.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
