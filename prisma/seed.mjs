/**
 * Sample data: a demo account and a few tourist spots in Porto Alegre.
 * Idempotent, so it can run on every deploy.
 *
 * Usage: npm run db:seed (also run by `prisma migrate reset`).
 */
import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAIL = 'demo@viajajunto.local';
const DEMO_PASSWORD = 'viaja-junto-demo';

/** Same format as ScryptPasswordHasher: `scrypt:<salt hex>:<key hex>`. */
function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);

  return ['scrypt', salt.toString('hex'), key.toString('hex')].join(':');
}

const location = { city: 'Porto Alegre', state: 'RS', country: 'Brasil', countryCode: 'BR' };

const spots = [
  {
    name: 'Usina do Gasômetro',
    category: 'HISTORICAL',
    description:
      'Antiga usina termelétrica às margens do Guaíba, hoje centro cultural com vista para o pôr do sol.',
    address: 'Av. Presidente João Goulart, 551',
    latitude: -30.034647,
    longitude: -51.241455,
  },
  {
    name: 'Parque Farroupilha (Redenção)',
    category: 'PARK',
    description:
      'O parque mais tradicional da cidade, com lago, espelho d’água e o Brique da Redenção aos domingos.',
    address: 'Av. Osvaldo Aranha',
    latitude: -30.036944,
    longitude: -51.215,
  },
  {
    name: 'Mercado Público',
    category: 'HISTORICAL',
    description:
      'Mercado de 1869 no Centro Histórico, com bancas de erva-mate, temperos e restaurantes.',
    address: 'Largo Glênio Peres',
    latitude: -30.027222,
    longitude: -51.228056,
  },
  {
    name: 'Fundação Iberê Camargo',
    category: 'MUSEUM',
    description:
      'Museu dedicado à obra de Iberê Camargo, em prédio premiado projetado por Álvaro Siza.',
    address: 'Av. Padre Cacique, 2000',
    latitude: -30.075278,
    longitude: -51.246944,
  },
  {
    name: 'Orla do Guaíba',
    category: 'NATURE',
    description:
      'Calçadão revitalizado à beira do Guaíba, com ciclovia, quadras e mirantes.',
    address: 'Av. Edvaldo Pereira Paiva',
    latitude: -30.045,
    longitude: -51.235,
  },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      name: 'Conta Demo',
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  for (const spot of spots) {
    await prisma.touristSpot.upsert({
      where: {
        name_city_country: {
          name: spot.name,
          city: location.city,
          country: location.country,
        },
      },
      update: {},
      create: { ...spot, ...location, createdBy: demo.id },
    });
  }

  console.log(
    `Seeded ${spots.length} tourist spots. Demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
  );
} finally {
  await prisma.$disconnect();
}
