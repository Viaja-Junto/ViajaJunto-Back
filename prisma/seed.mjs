// Idempotent sample data (runs on every deploy). Usage: npm run db:seed
// The ids are fixed so the Swagger examples (src/shared/http/openapi-samples.ts) point at real rows;
// on a database seeded before they existed, run `npm run db:reset` once.
import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const PASSWORD = 'viaja-junto-demo';

const ID = {
  demo: '11111111-1111-4111-8111-111111111111',
  traveller: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
  portoAlegre: 'd1000000-0000-4000-8000-000000000001',
  gramado: 'd1000000-0000-4000-8000-000000000002',
  rio: 'd1000000-0000-4000-8000-000000000003',
  pendingDestination: 'd1000000-0000-4000-8000-000000000004',
  usina: '51000000-0000-4000-8000-000000000001',
  redencao: '51000000-0000-4000-8000-000000000002',
  mercado: '51000000-0000-4000-8000-000000000003',
  ibere: '51000000-0000-4000-8000-000000000004',
  orla: '51000000-0000-4000-8000-000000000005',
  pendingSpot: '51000000-0000-4000-8000-000000000006',
  reviewUsina: 'a1000000-0000-4000-8000-000000000001',
  reviewMercado: 'a1000000-0000-4000-8000-000000000002',
  reviewRedencao: 'a1000000-0000-4000-8000-000000000003',
  destinationReview: 'a2000000-0000-4000-8000-000000000001',
  completedTrip: '71000000-0000-4000-8000-000000000001',
  plannedTrip: '71000000-0000-4000-8000-000000000002',
  completedStop: '72000000-0000-4000-8000-000000000001',
  stopPortoAlegre: '72000000-0000-4000-8000-000000000002',
  stopGramado: '72000000-0000-4000-8000-000000000003',
  member: '73000000-0000-4000-8000-000000000001',
  activityUsina: '74000000-0000-4000-8000-000000000001',
  activityMercado: '74000000-0000-4000-8000-000000000002',
  activityIbere: '74000000-0000-4000-8000-000000000003',
  budget: '75000000-0000-4000-8000-000000000001',
  expenseHotel: '76000000-0000-4000-8000-000000000001',
  expenseDinner: '76000000-0000-4000-8000-000000000002',
  expenseCompleted: '76000000-0000-4000-8000-000000000003',
  notification: '77000000-0000-4000-8000-000000000001',
};

// Same format as ScryptPasswordHasher.
function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);

  return ['scrypt', salt.toString('hex'), key.toString('hex')].join(':');
}

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const round = (average) => Math.round((average + Number.EPSILON) * 100) / 100;
const location = { city: 'Porto Alegre', state: 'RS', country: 'Brasil', countryCode: 'BR' };

const accounts = [
  { key: 'demo', name: 'Conta Demo', email: 'demo@viajajunto.local', role: 'USER' },
  { key: 'traveller', name: 'Viajante Demo', email: 'viajante@viajajunto.local', role: 'USER' },
  { key: 'admin', name: 'Administrador', email: 'admin@viajajunto.local', role: 'ADMIN' },
];

const destinations = [
  {
    key: 'portoAlegre',
    name: 'Porto Alegre',
    category: 'CITY',
    description: 'Capital gaúcha às margens do Guaíba, com parques, museus e o pôr do sol mais famoso do Sul.',
    latitude: -30.034647,
    longitude: -51.217658,
  },
  {
    key: 'gramado',
    name: 'Gramado',
    category: 'NATURE',
    description: 'Cidade serrana conhecida pelo chocolate, pelo Natal Luz e pela arquitetura em estilo alpino.',
    latitude: -29.378,
    longitude: -50.876,
  },
  {
    key: 'rio',
    name: 'Rio de Janeiro',
    category: 'BEACH',
    description: 'Praias, morros e o Cristo Redentor.',
    latitude: -22.906847,
    longitude: -43.172897,
  },
  {
    key: 'pendingDestination',
    name: 'Bento Gonçalves',
    category: 'NATURE',
    description: 'Vale dos Vinhedos e passeio de Maria Fumaça. Sugestão aguardando o admin.',
    status: 'PENDING',
  },
];

const spots = [
  {
    key: 'usina',
    name: 'Usina do Gasômetro',
    category: 'HISTORICAL',
    description: 'Antiga usina termelétrica às margens do Guaíba, hoje centro cultural com vista para o pôr do sol.',
    address: 'Av. Presidente João Goulart, 551',
    latitude: -30.034647,
    longitude: -51.241455,
  },
  {
    key: 'redencao',
    name: 'Parque Farroupilha (Redenção)',
    category: 'PARK',
    description: 'O parque mais tradicional da cidade, com lago, espelho d’água e o Brique da Redenção aos domingos.',
    address: 'Av. Osvaldo Aranha',
    latitude: -30.036944,
    longitude: -51.215,
  },
  {
    key: 'mercado',
    name: 'Mercado Público',
    category: 'HISTORICAL',
    description: 'Mercado de 1869 no Centro Histórico, com bancas de erva-mate, temperos e restaurantes.',
    address: 'Largo Glênio Peres',
    latitude: -30.027222,
    longitude: -51.228056,
  },
  {
    key: 'ibere',
    name: 'Fundação Iberê Camargo',
    category: 'MUSEUM',
    description: 'Museu dedicado à obra de Iberê Camargo, em prédio premiado projetado por Álvaro Siza.',
    address: 'Av. Padre Cacique, 2000',
    latitude: -30.075278,
    longitude: -51.246944,
  },
  {
    key: 'orla',
    name: 'Orla do Guaíba',
    category: 'NATURE',
    description: 'Calçadão revitalizado à beira do Guaíba, com ciclovia, quadras e mirantes.',
    address: 'Av. Edvaldo Pereira Paiva',
    latitude: -30.045,
    longitude: -51.235,
  },
  {
    key: 'pendingSpot',
    name: 'Cais Mauá',
    category: 'HISTORICAL',
    description: 'Armazéns históricos do porto. Sugestão aguardando o admin.',
    address: 'Av. Mauá',
    status: 'PENDING',
  },
];

const reviews = [
  { key: 'reviewUsina', spot: 'usina', rating: 5, comment: 'Pôr do sol imperdível, vá no fim da tarde.' },
  { key: 'reviewMercado', spot: 'mercado', rating: 4, comment: 'Ótimo para provar comida típica; lota no almoço.' },
  { key: 'reviewRedencao', spot: 'redencao', rating: 5, comment: 'Domingo com o Brique é o melhor programa.' },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const upsertById = (model, id, create) =>
  prisma[model].upsert({ where: { id }, update: {}, create: { id, ...create } });

try {
  const user = {};
  for (const { key, role, ...account } of accounts) {
    user[key] = (
      await prisma.user.upsert({
        where: { email: account.email },
        update: role === 'ADMIN' ? { role } : {},
        create: { id: ID[key], ...account, role, passwordHash: hashPassword(PASSWORD) },
      })
    ).id;
  }

  const destination = {};
  for (const { key, status = 'APPROVED', ...entry } of destinations) {
    destination[key] = (
      await prisma.destination.upsert({
        where: { name_country: { name: entry.name, country: 'Brasil' } },
        update: {},
        create: {
          id: ID[key],
          ...entry,
          country: 'Brasil',
          countryCode: 'BR',
          status,
          createdBy: user.demo,
        },
      })
    ).id;
  }

  const spot = {};
  for (const { key, status = 'APPROVED', ...entry } of spots) {
    spot[key] = (
      await prisma.touristSpot.upsert({
        where: { name_city_country: { name: entry.name, city: location.city, country: location.country } },
        update: {},
        create: {
          id: ID[key],
          ...entry,
          ...location,
          status,
          createdBy: user.demo,
          destinationId: destination.portoAlegre,
        },
      })
    ).id;
  }

  for (const { key, spot: spotKey, ...review } of reviews) {
    const touristSpotId = spot[spotKey];
    await prisma.review.upsert({
      where: { userId_touristSpotId: { userId: user.traveller, touristSpotId } },
      update: {},
      create: { id: ID[key], ...review, userId: user.traveller, touristSpotId },
    });
    await prisma.favoriteTouristSpot.upsert({
      where: { userId_touristSpotId: { userId: user.traveller, touristSpotId } },
      update: {},
      create: { userId: user.traveller, touristSpotId },
    });
  }

  for (const touristSpotId of Object.values(spot)) {
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

  const completed =
    (await prisma.trip.findFirst({
      where: { createdBy: user.traveller, name: 'Fim de semana em Porto Alegre' },
    })) ??
    (await prisma.trip.create({
      data: {
        id: ID.completedTrip,
        name: 'Fim de semana em Porto Alegre',
        status: 'COMPLETED',
        startDate: day('2026-10-10'),
        endDate: day('2026-10-12'),
        inviteCode: 'PRTALG23',
        createdBy: user.traveller,
      },
    }));
  if ((await prisma.tripDestination.count({ where: { tripId: completed.id } })) === 0) {
    await upsertById('tripDestination', ID.completedStop, {
      tripId: completed.id,
      destinationId: destination.portoAlegre,
      order: 0,
      arrival: day('2026-10-10'),
      departure: day('2026-10-12'),
    });
  }
  if ((await prisma.tripExpense.count({ where: { tripId: completed.id } })) === 0) {
    await upsertById('tripExpense', ID.expenseCompleted, {
      tripId: completed.id,
      payerId: user.traveller,
      amount: 180,
      description: 'Hospedagem no Centro Histórico',
      category: 'OTHER',
      spentOn: day('2026-10-10'),
      splitType: 'EQUAL',
      createdBy: user.traveller,
      shares: { create: [{ userId: user.traveller, amount: 180 }] },
    });
  }

  await upsertById('trip', ID.plannedTrip, {
    name: 'Férias no Sul',
    description: 'Capital e serra gaúcha com a turma.',
    status: 'PLANNING',
    startDate: day('2026-12-10'),
    endDate: day('2026-12-20'),
    inviteCode: 'SERRA234',
    createdBy: user.traveller,
  });
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: ID.plannedTrip, userId: user.demo } },
    update: {},
    create: { id: ID.member, tripId: ID.plannedTrip, userId: user.demo, permission: 'EDITOR' },
  });
  await upsertById('tripDestination', ID.stopPortoAlegre, {
    tripId: ID.plannedTrip,
    destinationId: destination.portoAlegre,
    order: 0,
    arrival: day('2026-12-10'),
    departure: day('2026-12-14'),
    description: 'Centro Histórico e orla.',
  });
  await upsertById('tripDestination', ID.stopGramado, {
    tripId: ID.plannedTrip,
    destinationId: destination.gramado,
    order: 1,
    arrival: day('2026-12-15'),
    departure: day('2026-12-20'),
    description: 'Natal Luz.',
  });
  for (const [key, spotKey, dateTime, durationMinutes, expectedCost, status] of [
    ['activityUsina', 'usina', '2026-12-11T21:00:00Z', 90, 0, 'CONFIRMED'],
    ['activityMercado', 'mercado', '2026-12-12T15:00:00Z', 60, 80, 'PENDING'],
    ['activityIbere', 'ibere', '2026-12-13T14:00:00Z', 120, 30, 'PENDING'],
  ]) {
    await upsertById('tripActivity', ID[key], {
      tripDestinationId: ID.stopPortoAlegre,
      touristSpotId: spot[spotKey],
      dateTime: new Date(dateTime),
      durationMinutes,
      expectedCost,
      status,
    });
  }
  await prisma.budget.upsert({
    where: { tripId: ID.plannedTrip },
    update: {},
    create: { id: ID.budget, tripId: ID.plannedTrip, totalValue: 3000 },
  });
  await upsertById('tripExpense', ID.expenseHotel, {
    tripId: ID.plannedTrip,
    payerId: user.traveller,
    amount: 1200,
    description: 'Hotel em Porto Alegre',
    category: 'OTHER',
    spentOn: day('2026-12-10'),
    splitType: 'EQUAL',
    createdBy: user.traveller,
    shares: {
      create: [
        { userId: user.traveller, amount: 600 },
        { userId: user.demo, amount: 600 },
      ],
    },
  });
  await upsertById('tripExpense', ID.expenseDinner, {
    tripId: ID.plannedTrip,
    payerId: user.demo,
    amount: 240,
    description: 'Jantar no Mercado Público',
    category: 'HISTORICAL',
    spentOn: day('2026-12-12'),
    splitType: 'EXACT',
    createdBy: user.demo,
    shares: {
      create: [
        { userId: user.traveller, amount: 140 },
        { userId: user.demo, amount: 100 },
      ],
    },
  });

  await upsertById('notification', ID.notification, {
    userId: user.traveller,
    tripId: ID.plannedTrip,
    actorId: user.demo,
    type: 'EXPENSE_ADDED',
    payload: {
      tripName: 'Férias no Sul',
      actorName: 'Conta Demo',
      subjectId: ID.expenseDinner,
      amount: 240,
      description: 'Jantar no Mercado Público',
    },
  });

  await prisma.favoriteDestination.upsert({
    where: { userId_destinationId: { userId: user.traveller, destinationId: destination.portoAlegre } },
    update: {},
    create: { userId: user.traveller, destinationId: destination.portoAlegre },
  });
  await prisma.destinationReview.upsert({
    where: { userId_destinationId: { userId: user.traveller, destinationId: destination.portoAlegre } },
    update: {},
    create: {
      id: ID.destinationReview,
      userId: user.traveller,
      destinationId: destination.portoAlegre,
      rating: 5,
      comment: 'Cidade acolhedora, com parques e museus ótimos.',
    },
  });
  const destinationRating = await prisma.destinationReview.aggregate({
    where: { destinationId: destination.portoAlegre },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.destination.update({
    where: { id: destination.portoAlegre },
    data: {
      averageRating: round(destinationRating._avg.rating ?? 0),
      reviewCount: destinationRating._count._all,
    },
  });

  const fixed = user.traveller === ID.traveller && spot.usina === ID.usina;
  console.log(
    `Seeded ${destinations.length} destinations, ${spots.length} tourist spots, ${reviews.length} reviews and 2 trips. ` +
      `Accounts: ${accounts.map((a) => a.email).join(', ')} (password ${PASSWORD}).` +
      (fixed ? '' : '\nThis database predates the fixed sample ids: run `npm run db:reset` for the Swagger examples to work.'),
  );
} finally {
  await prisma.$disconnect();
}
