/**
 * Sample data: a demo account with a few tourist spots in Porto Alegre, and a
 * traveller who reviewed some of them. Idempotent, so it can run on every deploy.
 *
 * Usage: npm run db:seed (also run by `prisma migrate reset`).
 */
import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAIL = 'demo@viajajunto.local';
const DEMO_PASSWORD = 'viaja-junto-demo';
const TRAVELLER_EMAIL = 'viajante@viajajunto.local';
const ADMIN_EMAIL = 'admin@viajajunto.local';

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

/** Spot name → what the traveller thought of it. */
const reviews = {
  'Usina do Gasômetro': { rating: 5, comment: 'Pôr do sol imperdível, vá no fim da tarde.' },
  'Mercado Público': { rating: 4, comment: 'Ótimo para provar comida típica; lota no almoço.' },
  'Parque Farroupilha (Redenção)': { rating: 5, comment: 'Domingo com o Brique é o melhor programa.' },
};

const round = (average) => Math.round((average + Number.EPSILON) * 100) / 100;

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

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN' },
    create: {
      name: 'Administrador',
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'ADMIN',
    },
  });

  const traveller = await prisma.user.upsert({
    where: { email: TRAVELLER_EMAIL },
    update: {},
    create: {
      name: 'Viajante Demo',
      email: TRAVELLER_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  for (const spot of spots) {
    const { id: touristSpotId } = await prisma.touristSpot.upsert({
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

    const review = reviews[spot.name];
    if (review) {
      await prisma.review.upsert({
        where: { userId_touristSpotId: { userId: traveller.id, touristSpotId } },
        update: {},
        create: { ...review, userId: traveller.id, touristSpotId },
      });
    }

    const { _avg, _count } = await prisma.review.aggregate({
      where: { touristSpotId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.touristSpot.update({
      where: { id: touristSpotId },
      data: {
        averageRating: _avg.rating === null ? null : round(_avg.rating),
        reviewCount: _count._all,
      },
    });
  }

  console.log(
    `Seeded ${spots.length} tourist spots and ${Object.keys(reviews).length} reviews. ` +
      `Accounts: ${DEMO_EMAIL}, ${TRAVELLER_EMAIL} and ${ADMIN_EMAIL} (admin), password ${DEMO_PASSWORD}`,
  );
} finally {
  await prisma.$disconnect();
}
