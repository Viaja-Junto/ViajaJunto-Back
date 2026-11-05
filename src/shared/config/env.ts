import { z } from 'zod';

/**
 * Validated once on import: a missing or malformed variable stops the boot
 * with the full list of problems instead of failing in the middle of a request.
 */
const corsOrigins = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : value,
  z
    .array(
      z.string().refine(
        (origin) => {
          try {
            return new URL(origin).origin === origin;
          } catch {
            return false;
          }
        },
        {
          message:
            'must be an origin such as http://localhost:5173 (no path, no trailing slash)',
        },
      ),
    )
    .min(1, 'at least one origin is required'),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  API_PREFIX: z.string().min(1).default('api'),

  SWAGGER_PATH: z.string().min(1).default('docs'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: 'must be a PostgreSQL connection string (postgresql://...)',
    }),

  CORS_ORIGINS: corsOrigins.default(['http://localhost:5173']),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(300),
  THROTTLE_WRITE_LIMIT: z.coerce.number().int().positive().default(60),
  THROTTLE_STRICT_LIMIT: z.coerce.number().int().positive().default(10),

  // Reverse proxies in front of the API (e.g. 1 behind a load balancer), so the
  // client IP is read from X-Forwarded-For instead of the proxy's address.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(
      `Invalid environment variables:\n${details}\n\n` +
        'Copy .env.example to .env and fill in the missing values.',
    );
  }

  return parsed.data;
}

export const env: Env = validateEnv();
