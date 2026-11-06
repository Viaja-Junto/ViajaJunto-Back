import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));

interface Import {
  file: string;
  target: string;
}

const ALIASES: Record<string, string> = {
  '@shared/': 'shared/',
  '@modules/': 'modules/',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

function resolveTarget(file: string, specifier: string): string {
  if (specifier.startsWith('.')) {
    return relative(SRC, resolve(dirname(file), specifier));
  }
  const alias = Object.keys(ALIASES).find((key) => specifier.startsWith(key));

  return alias ? ALIASES[alias] + specifier.slice(alias.length) : specifier;
}

const imports: Import[] = sourceFiles(SRC).flatMap((path) => {
  const file = relative(SRC, path);
  const source = readFileSync(path, 'utf8');

  return [...source.matchAll(/from\s+'([^']+)'/g)].map(([, specifier]) => ({
    file,
    target: resolveTarget(path, specifier),
  }));
});

function violations(
  inLayer: (file: string) => boolean,
  forbidden: RegExp,
): string[] {
  return imports
    .filter(({ file, target }) => inLayer(file) && forbidden.test(target))
    .map(({ file, target }) => `${file} -> ${target}`);
}

const isDomain = (file: string) => /(^|\/)domain\//.test(file);
const isApplication = (file: string) => /\/application\//.test(file);

describe('architecture', () => {
  it('keeps the domain free of frameworks and outer layers', () => {
    expect(
      violations(
        isDomain,
        /^@nestjs\/|^@prisma\/|^class-(validator|transformer)$|\/(application|infrastructure|presentation|http)\/|^shared\/(http|database)\//,
      ),
    ).toEqual([]);
  });

  it('keeps the application layer away from adapters', () => {
    expect(
      violations(isApplication, /^@prisma\/|\/(infrastructure|presentation)\//),
    ).toEqual([]);
  });

  it('keeps shared code independent of the feature modules', () => {
    expect(
      violations((file) => file.startsWith('shared/'), /^modules\//),
    ).toEqual([]);
  });

  it('finds the imports it checks', () => {
    expect(imports.length).toBeGreaterThan(500);
  });
});
