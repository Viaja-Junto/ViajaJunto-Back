import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

export function securityHeaders(...docsPaths: string[]) {
  const api = helmet();

  // Scalar and Swagger UI need jsDelivr scripts and inline styles; only the docs paths allow them.
  const docs = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  });
  const prefixes = docsPaths.map((path) => `/${trimSlashes(path)}`);

  return (req: Request, res: Response, next: NextFunction) => {
    const isDocs = prefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
    );

    (isDocs ? docs : api)(req, res, next);
  };
}

function trimSlashes(path: string): string {
  let start = 0;
  let end = path.length;

  while (start < end && path[start] === '/') start += 1;
  while (end > start && path[end - 1] === '/') end -= 1;

  return path.slice(start, end);
}
