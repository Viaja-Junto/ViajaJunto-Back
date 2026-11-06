/**
 * Promotes an account to ADMIN, the role that moderates the catalogs. The API
 * never grants it, so it is done here, against the database in DATABASE_URL.
 *
 * Usage: npm run user:make-admin -- <email>
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Usage: npm run user:make-admin -- <email>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const { count } = await prisma.user.updateMany({
    where: { email },
    data: { role: 'ADMIN' },
  });

  if (count === 0) {
    console.error(`No account with the email ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an administrator.`);
  }
} finally {
  await prisma.$disconnect();
}
