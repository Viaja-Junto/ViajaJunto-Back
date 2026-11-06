import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './dto/error-response.dto.js';

const REPOSITORY_URL = 'https://github.com/Viaja-Junto/ViajaJunto-Back';

const DESCRIPTION = [
  'REST API for ViajaJunto — tourist spots and what travellers think of them.',
  '',
  '### Authentication',
  'Create an account with `POST /auth/register` or sign in with',
  '`POST /auth/login`; both answer with an access token. Operations marked',
  'with a padlock require it in the `Authorization: Bearer <token>` header;',
  'without it they answer `401`.',
  '',
  'Public without a token: reading tourist spots and reviews, and',
  '`GET /health`.',
  '',
  '### Permissions',
  '- **Trips** — the creator (`OWNER`) manages the trip and its members; an',
  '  `EDITOR` changes stops, activities and budget; a `VIEWER` only reads.',
  '  Someone outside the trip gets `404`, as if it did not exist.',
  '- **Destination reviews** — only travellers who completed a trip that',
  '  stopped at the destination can review it (`403` otherwise).',
  '- **Catalogs (destinations and tourist spots)** — any signed-in user',
  '  suggests an entry, which waits for an administrator (`PENDING`); an',
  '  administrator approves it (public) or rejects it with a reason, and the',
  '  author is notified. Public lists only show approved entries. The author',
  '  changes or deletes a suggestion while it is not approved; afterwards only',
  '  an administrator does (`403` otherwise).',
  '- **Reviews** — one per user and spot, never on a spot you registered;',
  '  only the author changes or deletes it. Every change updates the spot',
  '  `averageRating` and `reviewCount`.',
  '',
  '### Pagination',
  'List operations accept `page` (default 1) and `limit` (default 20,',
  'maximum 100) and answer with a `{ data, meta }` envelope.',
  '',
  '### Rate limiting',
  'Requests are counted per client IP in a fixed window (60 s by default):',
  '300 reads and 60 writes per window. Over the limit the API answers `429`',
  'with a `Retry-After` header (seconds). Sensitive operations — signing up,',
  'signing in and writing reviews — allow 10. `GET /health` is not limited.',
  '',
  '### Errors',
  'Errors share one shape: `{ statusCode, message, error }`.',
  '',
  '| Code | Meaning |',
  '| ---- | ------- |',
  '| `400` | A path parameter is not a valid UUID |',
  '| `401` | Missing, invalid or expired access token, or wrong credentials |',
  '| `403` | Signed in, but not the owner of the record |',
  '| `404` | No such resource |',
  '| `409` | Uniqueness conflict |',
  '| `422` | Payload failed validation; `message` lists every violated rule |',
  '| `429` | Too many requests; retry after `Retry-After` seconds |',
  '| `503` | The database is down (`/health`) |',
].join('\n');

/**
 * Shared by the running API (src/main.ts) and the export script that feeds
 * Spectral in CI, so the contract that gets linted is the one that is served.
 */
export function buildOpenApiConfig() {
  const config = new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .setLicense('UNLICENSED', REPOSITORY_URL)
    // Relative first: "Try it" calls whichever host serves the docs, the local
    // API on :3000 or the EKS one through a port-forward on :8080.
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
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  config.info.contact = { name: 'ViajaJunto', url: REPOSITORY_URL };

  return config;
}

/** Operations the rate limiter skips (`@SkipThrottle`). */
const NOT_RATE_LIMITED = new Set(['Health']);

/**
 * Builds the document and adds the `429` of the rate limiter, which is an
 * APP_GUARD and therefore invisible to the Swagger scanner.
 */
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
