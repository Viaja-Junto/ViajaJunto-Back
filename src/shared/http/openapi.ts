import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './dto/error-response.dto.js';

const REPOSITORY_URL = 'https://github.com/Viaja-Junto/ViajaJunto-Back';

const DESCRIPTION = [
  'REST API for ViajaJunto: destinations and tourist spots suggested by',
  'travellers and moderated by an administrator, their reviews, and group',
  'trips with itinerary, activities, budget and notifications.',
  '',
  '### Try it on this page',
  '1. Open `POST /auth/login`, click **Try it out** and sign in, for example',
  '   with the seeded `demo@viajajunto.local` / `viaja-junto-demo`',
  '   (`admin@viajajunto.local` moderates the catalogs).',
  '2. Copy the `accessToken` from the response.',
  '3. Click **Authorize** (padlock at the top), paste the token and confirm.',
  '4. Every operation with a padlock now sends `Authorization: Bearer <token>`.',
  '',
  '### Authentication',
  'Create an account with `POST /auth/register` or sign in with',
  '`POST /auth/login`; both answer with an access token valid for one hour.',
  'Signing in with Google starts at `GET /auth/google` (a full page',
  'navigation, not fetch): the API redirects back to the frontend with the',
  'token in the URL fragment. `POST /auth/logout` ends every session of the',
  'account. Without a valid token, protected operations answer `401`.',
  '',
  'Public without a token: reading the approved catalogs and the reviews,',
  'and `GET /health`.',
  '',
  '### Permissions',
  '- **Catalogs (destinations and tourist spots)**: any signed-in user',
  '  suggests an entry, which waits for an administrator (`PENDING`); an',
  '  administrator approves it (public) or rejects it with a reason, and the',
  '  author is notified. The author changes a suggestion while it is not',
  '  approved; afterwards only an administrator does (`403`).',
  '- **Trips**: the creator (`OWNER`) manages the trip and its members; an',
  '  `EDITOR` changes stops, activities and budget; a `VIEWER` only reads.',
  '  Someone outside the trip gets `404`, as if it did not exist.',
  '- **Reviews**: one per user and spot, never on a spot you registered;',
  '  only the author changes or deletes it.',
  '- **Destination reviews**: only travellers who completed a trip that',
  '  stopped at the destination can review it (`403`).',
  '',
  '### Pagination',
  'List operations accept `page` (default 1) and `limit` (default 20,',
  'maximum 100) and answer with a `{ data, meta }` envelope.',
  '',
  '### Rate limiting',
  'Per client IP and minute: 300 reads and 60 writes. Signing up, signing in,',
  'reviews, joining a trip and photo uploads allow 10. Over the limit the API',
  'answers `429` with a `Retry-After` header. `GET /health` is not limited.',
  '',
  '### Errors',
  'Errors share one shape: `{ statusCode, message, error }`.',
  '',
  '| Code | Meaning |',
  '| ---- | ------- |',
  '| `400` | A path parameter is not a valid UUID |',
  '| `401` | Missing, invalid or expired access token, or wrong credentials |',
  '| `403` | Signed in, but not allowed to do this |',
  '| `404` | No such resource, or not visible to you |',
  '| `409` | Duplicate, or still in use |',
  '| `413` | Photo larger than 5 MB |',
  '| `422` | Payload failed validation; `message` lists every violated rule |',
  '| `429` | Too many requests; retry after `Retry-After` seconds |',
  '| `503` | Database down (`/health`), or S3/Google not configured |',
].join('\n');

export function buildOpenApiConfig() {
  const config = new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .setLicense('UNLICENSED', REPOSITORY_URL)
    // Relative first, so "Try it" calls whichever host serves the docs.
    .addServer('/', 'Same host as this page')
    .addServer('http://localhost:3000', 'Local development')
    .addTag('Health', 'Health check for containers and load balancers.')
    .addTag('Auth', 'Accounts, sign-in and the current session.')
    .addTag('Users', 'Accounts: search, profile and deletion.')
    .addTag(
      'Destinations',
      'Cities and regions travellers go to; suggested by users and published by an administrator.',
    )
    .addTag(
      'Tourist Spots',
      'Places worth a visit, registered by travellers and rated by their reviews.',
    )
    .addTag(
      'Reviews',
      'What travellers thought of a tourist spot, from 1 to 5.',
    )
    .addTag('Trips', 'Trips, their planning stage and invite codes.')
    .addTag(
      'Trip Members',
      'Who collaborates on a trip and with which permission.',
    )
    .addTag('Trip Destinations', 'Stops that make up a trip itinerary.')
    .addTag(
      'Trip Activities',
      'Visits to tourist spots scheduled inside a stop.',
    )
    .addTag('Budgets', 'The budget of a trip and how much of it is planned.')
    .addTag(
      'Destination Reviews',
      'Ratings of destinations, written by travellers who completed a trip there.',
    )
    .addTag('Notifications', 'In-app notifications of the signed-in user.')
    .addTag('Favorites', 'Destinations and tourist spots the user saved.')
    .addTag(
      'Trip Expenses',
      'What was actually spent on a trip and who owes whom.',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  config.info.contact = { name: 'ViajaJunto', url: REPOSITORY_URL };

  return config;
}

const NOT_RATE_LIMITED = new Set(['Health']);

// The throttler is an APP_GUARD the Swagger scanner cannot see, so its 429 is added here.
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig(), {
    extraModels: [ErrorResponseDto],
  });

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || !operation.responses)
        continue;
      if (operation.tags?.some((tag: string) => NOT_RATE_LIMITED.has(tag)))
        continue;

      operation.responses['429'] ??= {
        description:
          'Too many requests from this IP in the current window. Retry after the number of seconds in `Retry-After`.',
        headers: {
          'Retry-After': {
            description: 'Seconds until the window resets.',
            schema: { type: 'integer', example: 42 },
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponseDto' },
            example: {
              statusCode: 429,
              message: 'ThrottlerException: Too Many Requests',
            },
          },
        },
      };
    }
  }

  return document;
}
