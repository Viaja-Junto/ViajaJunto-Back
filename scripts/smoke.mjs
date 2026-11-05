// Usage: npm run smoke [-- <base url>] (main flow) | npm run smoke:all [-- <base url>] (every route)
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const all = args.includes('--all');
const baseUrl =
  args.find((arg) => !arg.startsWith('--')) ?? process.env.BASE_URL ?? 'http://localhost:3000/api';
const collection = JSON.parse(
  readFileSync(new URL('../postman/ViajaJunto.postman_collection.json', import.meta.url), 'utf8'),
);

const MANUAL = new Set([
  'Sign in with Google (abrir no navegador)',
  'Upload a photo (escolha um arquivo)',
]);

const MAIN = new Set([
  'Health check',
  'Register',
  'Me',
  'Login as admin (seed)',
  'List destinations',
  'List tourist spots',
  'Suggest a tourist spot',
  'Approve my tourist spot',
  'Review a tourist spot',
  'Check the new average',
  'Create trip',
  'Add a stop',
  'Add an activity',
  'Create budget',
  'Budget summary',
  '403 - review your own spot',
  'Delete review',
  'Delete trip',
  'Delete my tourist spot (admin)',
]);

const selected = (item) => !MANUAL.has(item.name) && (all || MAIN.has(item.name));

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = color('32');
const red = color('31');
const bold = color('1');
const dim = color('2');

const vars = Object.fromEntries(collection.variable.map(({ key, value }) => [key, value]));
vars.baseUrl = baseUrl.replace(/\/$/, '');
const fill = (text) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');

function expect(actual) {
  const check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const matchers = {
    eql: (value) =>
      check(JSON.stringify(actual) === JSON.stringify(value), `expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`),
    get exist() {
      return check(actual !== undefined && actual !== null, 'expected a value');
    },
    an: (type) => check(type === 'array' ? Array.isArray(actual) : typeof actual === type, `expected ${type}`),
    above: (n) => check(actual > n, `expected more than ${n}, got ${actual}`),
  };
  return { to: { ...matchers, be: matchers } };
}

async function send(item) {
  const failures = [];
  let response;
  let body;

  const pm = {
    collectionVariables: { get: (key) => vars[key], set: (key, value) => (vars[key] = value) },
    test: (name, fn) => {
      try {
        fn();
      } catch (error) {
        failures.push(`${name}: ${error.message}`);
      }
    },
    expect,
    get response() {
      return {
        json: () => body,
        to: {
          have: {
            status: (code) => {
              if (response.status !== code) {
                throw new Error(`expected ${code}, got ${response.status} ${JSON.stringify(body?.message ?? '')}`);
              }
            },
          },
        },
      };
    },
  };
  const runScript = (listen) => {
    const event = item.event?.find((e) => e.listen === listen);
    if (event) new Function('pm', event.script.exec.join('\n'))(pm);
  };

  runScript('prerequest');

  const { method, url, header, body: payload, auth } = item.request;
  const headers = Object.fromEntries(header.map(({ key, value }) => [key, fill(value)]));
  const bearer =
    auth?.type === 'bearer' ? fill(auth.bearer[0].value) : auth?.type === 'noauth' ? '' : vars.token;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const query = (url.query ?? [])
    .filter((q) => !q.disabled)
    .map((q) => `${q.key}=${encodeURIComponent(fill(q.value))}`)
    .join('&');
  const target = fill(url.raw.split('?')[0]) + (query ? `?${query}` : '');

  response = await fetch(target, { method, headers, body: payload ? fill(payload.raw) : undefined });
  const text = await response.text();
  body = text ? JSON.parse(text) : undefined;

  runScript('test');

  return { method, path: target.slice(vars.baseUrl.length), status: response.status, failures };
}

try {
  await fetch(`${vars.baseUrl}/health`);
} catch {
  console.error(red(`The API is not answering on ${vars.baseUrl}.`));
  console.error('Start it first: npm run start:dev (local) or ./demo.sh api (EKS).');
  process.exit(1);
}

console.log(bold(`ViajaJunto API — ${all ? 'every route' : 'main routes'} — ${vars.baseUrl}`));
let passed = 0;
let failed = 0;

for (const folder of collection.item) {
  const items = folder.item.filter(selected);
  if (items.length === 0) continue;
  console.log(`\n${bold(folder.name)}`);
  for (const item of items) {
    const { method, path, status, failures } = await send(item);
    const ok = failures.length === 0;
    ok ? passed++ : failed++;
    console.log(`  ${ok ? green('✓') : red('✗')} ${String(status).padEnd(4)}${method.padEnd(7)}${path} ${dim(`— ${item.name}`)}`);
    failures.forEach((failure) => console.log(`      ${red(failure)}`));
  }
}

console.log(`\n${failed ? red(`${failed} failed`) : green('all passed')} — ${passed} of ${passed + failed} requests`);
process.exit(failed ? 1 : 0);
