#!/usr/bin/env node
// Prints one JSON line describing the JS/TS project (or plain infra folder) that contains argv[2] (default: cwd).
// Zero dependencies. Empty fields are omitted so the output stays small.
// Never prints values from .env*, .npmrc or other credential files: only key names from an allowlist.
// Usage: node detect.mjs [dir-or-file]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const readJson = (p) => {
  const t = read(p);
  if (t === null) return null;
  try { return JSON.parse(t); } catch { return {}; }
};
const exists = (dir, ...names) => names.filter((n) => existsSync(join(dir, n)));
const major = (v) => { const m = String(v ?? '').match(/(\d+)/); return m ? Number(m[1]) : undefined; };

function keep(v) {
  if (v === undefined || v === null || v === false || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}
function compact(v) {
  if (Array.isArray(v)) return v.map(compact).filter(keep);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      const c = compact(x);
      if (keep(c)) o[k] = c;
    }
    return o;
  }
  return v;
}
// `found: false` survives compaction: it is the signal that no package.json exists.
const out = ({ found, ...o }) =>
  console.log(JSON.stringify({ ...(found === false ? { found } : {}), ...compact(o) }, null, process.stdout.isTTY ? 2 : 0));

// JSONC (tsconfig): drop comments outside strings, then trailing commas.
function readJsonc(p) {
  const t = read(p);
  if (t === null) return null;
  let s = '';
  for (let i = 0, inStr = false; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      s += c;
      if (c === '\\') s += t[++i] ?? '';
      else if (c === '"') inStr = false;
    } else if (c === '"') { inStr = true; s += c; }
    else if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; s += '\n'; }
    else if (c === '/' && t[i + 1] === '*') { i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++; i++; }
    else s += c;
  }
  try { return JSON.parse(s.replace(/,(\s*[}\]])/g, '$1')); } catch { return {}; }
}

// ---- locate package dir and workspace root --------------------------------
let start = resolve(process.argv[2] ?? process.cwd());
if (!existsSync(start)) { out({ found: false, error: `path not found: ${start}` }); process.exit(0); }
start = realpathSync(start); // git prints real paths (macOS /var -> /private/var); compare like with like
if (statSync(start).isFile()) start = dirname(start);

const up = (from, pred, max = 12) => {
  let d = from;
  for (let i = 0; i < max; i++) {
    if (pred(d)) return d;
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  return null;
};

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const only = (refs) => refs.filter((p) => existsSync(join(SKILL_DIR, p)));

// ---- git: host adapter facts -----------------------------------------------
const REMOTE_RE = /^(?:[a-z+]+:\/\/)?(?:[^@/]+@)?([^/:]+)(?::\d+)?[:/](.+?)\/([^/]+?)(?:\.git)?\/?$/i;
const onPath = (bin) => (process.env.PATH ?? '').split(delimiter).some((d) => d && existsSync(join(d, bin)));
function gitInfo(dir) {
  const run = (...a) => {
    try {
      return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return ''; }
  };
  const gitRoot = run('rev-parse', '--show-toplevel');
  if (!gitRoot) return { gitRoot: '' };
  const m = run('remote', 'get-url', 'origin').match(REMOTE_RE);
  const raw = m?.[1].toLowerCase();
  const host = !raw ? undefined : raw.includes('github') ? 'github' : raw.includes('gitlab') ? 'gitlab'
    : raw.includes('bitbucket') ? 'bitbucket' : raw;
  const cliName = { github: 'gh', gitlab: 'glab' }[host];
  const branch = run('branch', '--show-current');
  return {
    gitRoot,
    git: {
      host, owner: m?.[2], repo: m?.[3], branch,
      ticket: branch.match(/\b[A-Z][A-Z0-9]{1,9}-\d+\b/)?.[0],
      cli: cliName && onPath(cliName) ? cliName : undefined,
    },
  };
}

// ---- project instruction files (cwd up to git root): the project wins over the skill ----
const INSTR_FILES = ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md', 'CLAUDE.local.md', 'GEMINI.md', 'CONTRIBUTING.md',
  '.cursorrules', '.windsurfrules', '.cursor/rules', '.claude/rules', '.github/copilot-instructions.md',
  '.github/instructions', '.devin/rules', '.windsurf/rules'];
function instructionFiles(from, stopAt) {
  const found = [];
  let d = from;
  for (let i = 0; i < 8; i++) {
    for (const f of exists(d, ...INSTR_FILES)) found.push(relative(from, join(d, f)) || f);
    if (d === stopAt || dirname(d) === d) break;
    d = dirname(d);
  }
  return found;
}

// ---- no package.json: plain infra folder or unknown ------------------------
const pkgDir = up(start, (d) => existsSync(join(d, 'package.json')));
if (!pkgDir) {
  const gi = gitInfo(start);
  let shell = [];
  try { shell = readdirSync(start).filter((n) => n.endsWith('.sh')); } catch { /* ignore */ }
  const infraFiles = exists(start, 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
    'nginx.conf', 'Caddyfile', '.gitlab-ci.yml', 'bitbucket-pipelines.yml', '.github/workflows');
  const role = infraFiles.length || shell.length ? 'infra' : undefined;
  out({
    found: false,
    start,
    role,
    infra: infraFiles,
    shell,
    git: gi.git,
    instructions: instructionFiles(start, gi.gitRoot || start),
    skillDir: SKILL_DIR,
    read: role ? only(['references/infra.md']) : [],
    hint: role ? undefined : 'no package.json at or above start dir; inspect manually',
  });
  process.exit(0);
}

// ---- package and workspace -------------------------------------------------
const WS_FILES = ['turbo.json', 'nx.json', 'lerna.json', 'rush.json'];
const isWsRoot = (d) =>
  WS_FILES.some((f) => existsSync(join(d, f))) ||
  /^packages:/m.test(read(join(d, 'pnpm-workspace.yaml')) ?? '') ||
  Boolean(readJson(join(d, 'package.json'))?.workspaces);
const root = up(pkgDir, isWsRoot, 8) ?? pkgDir;
const isMono = isWsRoot(root);

const pkg = readJson(join(pkgDir, 'package.json')) ?? {};
const rootPkg = root === pkgDir ? pkg : readJson(join(root, 'package.json')) ?? {};
const depsOf = (p) => ({ ...p.peerDependencies, ...p.dependencies, ...p.devDependencies });
const deps = { ...depsOf(rootPkg), ...depsOf(pkg) };
const pick = (names) => names.filter((n) => deps[n]);
const dirsToCheck = [...new Set([pkgDir, root])];
const anyHas = (...names) => dirsToCheck.some((d) => exists(d, ...names).length > 0);
const installed = (n) => {
  for (const d of dirsToCheck) {
    const v = readJson(join(d, 'node_modules', n, 'package.json'))?.version;
    if (v) return v;
  }
  return undefined;
};
const ver = (n) => installed(n) ?? deps[n];
const firstLine = (...names) => {
  for (const d of dirsToCheck) {
    for (const n of names) { const t = read(join(d, n)); if (t) return t.split('\n')[0].trim(); }
  }
  return undefined;
};

// ---- role ------------------------------------------------------------------
const META = ['next', 'nuxt', '@sveltejs/kit', '@remix-run/react', '@react-router/dev', 'astro',
  '@tanstack/react-start', '@solidjs/start', '@builder.io/qwik-city'];
const FE = ['react', 'vue', 'svelte', '@angular/core', 'solid-js', 'preact', 'lit', '@builder.io/qwik',
  'react-native', 'expo'];
const BE = ['express', 'fastify', '@nestjs/core', 'koa', 'hono', '@hapi/hapi', 'hapi', 'restify', 'polka', 'elysia',
  '@trpc/server', '@apollo/server', 'apollo-server', 'graphql-yoga', 'mercurius', '@adonisjs/core', 'sails',
  '@feathersjs/feathers', 'h3', 'nitropack', 'socket.io', 'ws', 'bullmq', 'bull', 'agenda', 'serverless',
  '@azure/functions', 'firebase-functions', '@google-cloud/functions-framework', '@vercel/node', 'wrangler',
  'aws-lambda', '@types/aws-lambda'];
// hapi apps that only list plugins (e.g. via @hapi/glue) never name @hapi/hapi themselves
const HAPI_PLUGINS = ['@hapi/glue', '@hapi/vision', '@hapi/inert', '@hapi/cookie', '@hapi/basic', '@hapi/yar',
  '@hapi/bell', '@hapi/catbox', '@hapi/good'];
BE.push(...HAPI_PLUGINS);

function classify(d) {
  const has = (list) => list.filter((n) => d[n]);
  const meta = has(META), fe = has(FE), be = has(BE);
  const front = meta.length > 0 || fe.length > 0;
  const back = meta.length > 0 || be.length > 0;
  return { meta, fe, be, role: front && back ? 'fullstack' : front ? 'frontend' : back ? 'backend' : null };
}

const DATA = ['@prisma/client', 'prisma', 'drizzle-orm', 'typeorm', 'sequelize', 'mongoose', '@mikro-orm/core',
  'knex', 'kysely', 'pg', 'postgres', 'mysql2', 'better-sqlite3', 'sqlite3', 'mongodb', 'redis', 'ioredis',
  '@supabase/supabase-js', '@libsql/client', '@neondatabase/serverless', 'firebase-admin'];
const AUTH = ['passport', 'jsonwebtoken', 'jose', 'next-auth', '@auth/core', 'better-auth', 'lucia',
  '@clerk/nextjs', '@fastify/jwt', 'bcrypt', 'bcryptjs', 'argon2'];
// Packages whose calls act on the outside world: money, orders, messages to people, remote storage.
const SIDE_EFFECTS = ['stripe', '@paddle/paddle-node-sdk', '@lemonsqueezy/lemonsqueezy.js', 'braintree', 'iyzipay',
  '@paypal/paypal-server-sdk', '@paypal/checkout-server-sdk', '@adyen/api-library', 'nodemailer', 'resend',
  '@sendgrid/mail', 'postmark', 'mailgun.js', '@aws-sdk/client-ses', '@aws-sdk/client-sesv2', 'twilio',
  '@vonage/server-sdk', 'web-push', 'expo-server-sdk', 'firebase-admin', '@aws-sdk/client-s3', 'aws-sdk',
  '@google-cloud/storage', '@azure/storage-blob', 'minio', 'ccxt', 'binance', 'node-binance-api', 'binance-api-node',
  '@binance/connector', '@oanda/v20', '@alpacahq/alpaca-trade-api', 'ethers', 'viem', 'web3', '@solana/web3.js',
  'telegraf', 'node-telegram-bot-api', 'discord.js', '@slack/web-api'];

const c = classify(deps);
let role = c.role;
let hint;
if (!role && existsSync(join(pkgDir, 'index.html'))) role = 'frontend';
if (!role && isMono && root === pkgDir && wsPackages().length > 0) role = 'monorepo-root';
const libShaped = Boolean(pkg.main || pkg.exports || pkg.types || pkg.module);
if (!role && (pkg.scripts?.start || pkg.scripts?.dev || ((pick(DATA).length || pick(AUTH).length) && !libShaped))) {
  role = 'backend';
  hint = 'no known framework; role inferred from start/dev script or data/auth deps: read the entry point';
}
if (!role) role = pkg.bin ? 'cli' : libShaped ? 'library' : 'unknown';

// ---- monorepo --------------------------------------------------------------
function wsGlobs() {
  const g = [];
  const w = rootPkg.workspaces;
  if (Array.isArray(w)) g.push(...w);
  else if (Array.isArray(w?.packages)) g.push(...w.packages);
  const y = read(join(root, 'pnpm-workspace.yaml'));
  if (y) {
    let on = false;
    for (const line of y.split('\n')) {
      if (/^packages:\s*$/.test(line)) { on = true; continue; }
      if (on && /^\S/.test(line)) on = false;
      const m = on && line.match(/^\s+-\s+['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/);
      if (m) g.push(m[1]);
    }
  }
  return g;
}

// Expand one workspace pattern (supports `*` inside any segment, `a/b`, `!neg` handled by caller; no `**`).
function expandGlob(base, segs) {
  if (segs.length === 0) return existsSync(join(base, 'package.json')) ? [base] : [];
  const [seg, ...rest] = segs;
  if (!/[*?]/.test(seg)) return expandGlob(join(base, seg), rest);
  const re = new RegExp(`^${seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  let ents;
  try { ents = readdirSync(base, { withFileTypes: true }); } catch { return []; }
  return ents
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && re.test(e.name))
    .flatMap((e) => expandGlob(join(base, e.name), rest));
}

function wsPackages() {
  const dirs = new Set();
  for (const g of wsGlobs()) {
    if (g.startsWith('!') || g.includes('**') || /[{[]/.test(g)) continue; // unsupported pattern
    for (const d of expandGlob(root, g.replace(/^\.\//, '').split('/').filter(Boolean))) dirs.add(d);
  }
  return [...dirs];
}

let monorepo;
if (isMono) {
  const tool = [
    anyHas('pnpm-workspace.yaml') && 'pnpm',
    rootPkg.workspaces && 'workspaces',
    exists(root, 'turbo.json').length > 0 && 'turbo',
    exists(root, 'nx.json').length > 0 && 'nx',
    exists(root, 'lerna.json').length > 0 && 'lerna',
    exists(root, 'rush.json').length > 0 && 'rush',
  ].filter(Boolean).join('+');
  let packages;
  if (root === pkgDir) {
    const all = wsPackages();
    packages = all.slice(0, 25).map((d) => {
      const cp = readJson(join(d, 'package.json')) ?? {};
      const cd = depsOf(cp);
      const cl = classify(cd);
      const fw = [...cl.meta, ...cl.be, ...(cl.meta.length ? [] : cl.fe)].slice(0, 3).join(',');
      const rn = ['vitest', 'jest', 'mocha', 'ava', 'tap'].find((n) => cd[n]) ?? (/\bnode\b.*--test\b/.test(cp.scripts?.test ?? '') ? 'node:test' : '');
      return `${relative(root, d)}${cp.name ? ` [${cp.name}]` : ''} ${cl.role ?? 'lib'}${fw ? ` (${fw})` : ''}${rn ? ` ${rn}` : ''}`;
    });
    if (all.length > 25) packages.push(`+${all.length - 25} more`);
  }
  monorepo = { tool, root: root === pkgDir ? '.' : relative(pkgDir, root), packages };
}

// ---- tests -----------------------------------------------------------------
const SKIP = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'tmp', 'temp', 'assets', 'public',
  'static', 'vendor', 'vendors', 'bower_components', 'third_party']);
let visited = 0;
const CAP = 4000;
function countTests(dir, depth = 0, inTestDir = false) {
  if (depth > 6 || visited > CAP) return 0;
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  let n = 0;
  for (const e of ents) {
    visited++;
    if (e.isDirectory()) {
      if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
      n += countTests(join(dir, e.name), depth + 1, inTestDir || /^(__tests__|tests?|e2e|spec)$/.test(e.name));
    } else if (/\.[cm]?[jt]sx?$/.test(e.name) && (inTestDir || /\.(test|spec)\.[cm]?[jt]sx?$/.test(e.name))) {
      n++;
    }
  }
  return n;
}

const testScript = pkg.scripts?.test || rootPkg.scripts?.test || '';
let runner = pick(['vitest', 'jest', 'mocha', 'ava', 'tap', 'uvu', 'jasmine', '@japa/runner'])[0];
if (!runner && /\bnode\b.*--test\b/.test(testScript)) runner = 'node:test';
if (!runner && /\bbun test\b/.test(testScript)) runner = 'bun:test';
const testCount = countTests(pkgDir);
const tests = {
  runner: runner ?? 'none',
  e2e: pick(['@playwright/test', 'cypress', 'puppeteer', 'webdriverio', 'testcafe']),
  libs: pick(['@testing-library/react', '@testing-library/vue', '@testing-library/svelte', '@testing-library/dom',
    '@vue/test-utils', 'supertest', 'msw', 'nock', 'sinon', 'testcontainers', 'mongodb-memory-server', 'pg-mem',
    'storybook']),
  files: visited > CAP ? `${testCount}+` : testCount,
};

// ---- scripts ---------------------------------------------------------------
const SCRIPT_KEYS = /^(dev|start|serve|build|test(:.+)?|lint(:.+)?|typecheck|type-check|check-types|tsc|check|format|migrate|db:.+|e2e|watch|generate|codegen)$/;
const pickScripts = (p) =>
  Object.fromEntries(
    Object.entries(p.scripts ?? {})
      .filter(([k, v]) => SCRIPT_KEYS.test(k) && !/no test specified/.test(v))
      .slice(0, 14)
      .map(([k, v]) => [k, String(v).slice(0, 70)]),
  );

// ---- package manager and supply-chain policy -------------------------------
const LOCKS = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm']];
const pmSpec = String(pkg.packageManager ?? rootPkg.packageManager ?? '');
const pmField = pmSpec.split('@')[0];
const lockfiles = LOCKS.filter(([f]) => anyHas(f));
const pm = pmField || lockfiles[0]?.[1] || 'npm'; // no lockfile and no packageManager: npm is the Node default

const NPMRC_KEYS = new Set(['ignore-scripts', 'min-release-age', 'minimum-release-age', 'allow-git', 'allow-remote',
  'strict-allow-scripts', 'engine-strict', 'legacy-peer-deps', 'node-linker', 'shamefully-hoist', 'save-exact']);
const pmPolicy = [];
const wsYaml = read(join(root, 'pnpm-workspace.yaml')) ?? '';
for (const k of ['allowBuilds', 'onlyBuiltDependencies', 'neverBuiltDependencies', 'minimumReleaseAge',
  'blockExoticSubdeps', 'catalog', 'catalogs', 'overrides']) {
  if (new RegExp(`^${k}:`, 'm').test(wsYaml)) pmPolicy.push(`pnpm-workspace:${k}`);
}
for (const p of [rootPkg, pkg]) {
  if (p.pnpm?.onlyBuiltDependencies) pmPolicy.push('package.json:pnpm.onlyBuiltDependencies');
  if (p.trustedDependencies) pmPolicy.push('package.json:trustedDependencies');
  if (p.allowScripts) pmPolicy.push('package.json:allowScripts');
}
for (const d of dirsToCheck) {
  for (const line of (read(join(d, '.npmrc')) ?? '').split('\n')) {
    const k = line.split('=')[0].trim();
    if (NPMRC_KEYS.has(k)) pmPolicy.push(`.npmrc:${k}`);
  }
  for (const line of (read(join(d, '.yarnrc.yml')) ?? '').split('\n')) {
    const k = line.split(':')[0].trim();
    if (['nodeLinker', 'npmMinimalAgeGate', 'enableScripts'].includes(k)) pmPolicy.push(`.yarnrc.yml:${k}`);
  }
}

// ---- versions: majors of the libraries whose majors change the code an agent writes ----
const VERSION_KEYS = ['typescript', 'react', 'next', 'vue', 'nuxt', 'svelte', '@sveltejs/kit', 'astro', 'react-router',
  '@tanstack/react-query', 'zod', 'prisma', '@prisma/client', 'drizzle-orm', 'mongoose', 'typeorm', 'tailwindcss', 'vite',
  'vitest', 'jest', 'msw', 'eslint', 'express', 'fastify', '@nestjs/core', 'koa', 'hono', '@trpc/server',
  '@apollo/server', 'bullmq', 'payload', '@strapi/strapi', 'zustand', '@reduxjs/toolkit', 'storybook'];
const versions = Object.fromEntries(pick(VERSION_KEYS).map((n) => [n, major(ver(n))]).filter(([, v]) => v !== undefined));
if (pmField && major(pmSpec.split('@')[1]) !== undefined) versions[pmField] = major(pmSpec.split('@')[1]);

// ---- tsconfig ------------------------------------------------------------------
function tsconfigInfo() {
  const base = ['tsconfig.json', 'tsconfig.base.json'].map((f) => join(pkgDir, f)).find((p) => existsSync(p))
    ?? (existsSync(join(root, 'tsconfig.base.json')) ? join(root, 'tsconfig.base.json') : null);
  if (!base) return undefined;
  const t = readJsonc(base) ?? {};
  let co = t.compilerOptions ?? {};
  // one level of relative `extends` (package extends such as "@tsconfig/node22" are not followed)
  const ext = [].concat(t.extends ?? []).find((e) => typeof e === 'string' && e.startsWith('.'));
  if (ext) co = { ...(readJsonc(resolve(dirname(base), ext.endsWith('.json') ? ext : `${ext}.json`))?.compilerOptions ?? {}), ...co };
  return {
    file: relative(pkgDir, base),
    strict: co.strict,
    module: co.module,
    moduleResolution: co.moduleResolution,
    verbatimModuleSyntax: co.verbatimModuleSyntax,
    erasableSyntaxOnly: co.erasableSyntaxOnly,
    baseUrl: co.baseUrl !== undefined || undefined,
    paths: co.paths !== undefined || undefined,
    types: co.types,
    references: Array.isArray(t.references) && t.references.length > 0 || undefined,
  };
}

// ---- lint / format tool of record --------------------------------------------
const lint = [
  anyHas('eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts') && 'eslint-flat',
  (anyHas('.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml') || pkg.eslintConfig) && 'eslint-legacy',
  (anyHas('biome.json', 'biome.jsonc') || deps['@biomejs/biome']) && 'biome',
  (anyHas('.oxlintrc.json') || deps.oxlint) && 'oxlint',
  (anyHas('.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.yml', '.prettierrc.yaml', 'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs') || deps.prettier || pkg.prettier) && 'prettier',
].filter(Boolean);

// ---- generated code: regenerate, never hand-edit ------------------------------
function generatedInfo() {
  const g = exists(pkgDir, 'src/payload-types.ts', 'payload-types.ts', 'src/routeTree.gen.ts', 'app/routeTree.gen.ts',
    'routeTree.gen.ts', 'next-env.d.ts', '.react-router/types', 'src/gql', 'src/__generated__', 'src/generated',
    'worker-configuration.d.ts', 'src/app/(payload)/admin/importMap.js', 'app/(payload)/admin/importMap.js');
  const cg = exists(pkgDir, 'codegen.ts', 'codegen.yml', 'codegen.yaml', 'codegen.json');
  if (cg.length) g.push(`${cg[0]} (graphql-codegen config)`);
  const schema = read(join(pkgDir, 'prisma', 'schema.prisma')) ?? read(join(pkgDir, 'schema.prisma'));
  if (schema) {
    const gen = schema.match(/generator\s+\w+\s*\{([^}]*)\}/)?.[1] ?? '';
    const provider = gen.match(/provider\s*=\s*"([^"]+)"/)?.[1];
    const output = gen.match(/output\s*=\s*"([^"]+)"/)?.[1];
    g.push(`prisma client (${provider ?? '?'}${output ? ` -> ${output}` : ''})`);
  }
  const ga = read(join(root, '.gitattributes')) ?? '';
  for (const l of ga.split('\n')) if (/linguist-generated(=true)?\b/.test(l)) g.push(`${l.split(/\s+/)[0]} (.gitattributes)`);
  return g.slice(0, 12);
}

// ---- docs shipped inside installed packages (version-matched; read before memory) ----
function bundledDocs() {
  const found = [];
  for (const d of dirsToCheck) {
    for (const p of ['node_modules/next/dist/docs', '.next-docs']) {
      if (existsSync(join(d, p))) found.push(relative(pkgDir, join(d, p)) || p);
    }
  }
  for (const n of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 300)) {
    if (n === 'next') continue;
    for (const d of dirsToCheck) {
      const hit = exists(join(d, 'node_modules', n), 'AGENTS.md', 'llms.txt', 'skills');
      if (hit.length) { found.push(relative(pkgDir, join(d, 'node_modules', n, hit[0]))); break; }
    }
    if (found.length >= 10) break;
  }
  return [...new Set(found)];
}

// ---- Next.js specifics that change which API is correct ---------------------
function nextInfo() {
  if (!deps.next) return undefined;
  const cfg = ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs'].map((f) => read(join(pkgDir, f))).find(Boolean) ?? '';
  const app = exists(pkgDir, 'app', 'src/app').length > 0;
  const pages = exists(pkgDir, 'pages', 'src/pages').length > 0;
  const proxy = exists(pkgDir, 'proxy.ts', 'proxy.js', 'src/proxy.ts', 'src/proxy.js').length > 0;
  const mw = exists(pkgDir, 'middleware.ts', 'middleware.js', 'src/middleware.ts', 'src/middleware.js').length > 0;
  const agents = read(join(pkgDir, 'AGENTS.md')) ?? read(join(root, 'AGENTS.md')) ?? '';
  return {
    router: app && pages ? 'both' : app ? 'app' : pages ? 'pages' : undefined,
    interceptor: proxy ? 'proxy' : mw ? 'middleware' : undefined,
    cacheComponents: /cacheComponents\s*:\s*true/.test(cfg) || undefined,
    reactCompiler: /reactCompiler\s*:\s*(true|\{)/.test(cfg) || Boolean(deps['babel-plugin-react-compiler']) || undefined,
    customWebpack: /\bwebpack\s*[:(]/.test(cfg) || undefined,
    devServerRunning: existsSync(join(pkgDir, '.next', 'dev', 'lock')) || undefined,
    managedAgentsBlock: agents.includes('BEGIN:nextjs-agent-rules') || undefined,
  };
}

// ---- infra -----------------------------------------------------------------
const infra = [
  anyHas('Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml') && 'docker',
  anyHas('.github/workflows') && 'github-actions',
  anyHas('.github/workflows/actions.lock') && 'actions-lock',
  anyHas('.gitlab-ci.yml') && 'gitlab-ci',
  anyHas('bitbucket-pipelines.yml') && 'bitbucket-pipelines',
  anyHas('.circleci') && 'circleci',
  anyHas('Jenkinsfile') && 'jenkins',
  anyHas('.github/dependabot.yml') && 'dependabot',
  anyHas('renovate.json', '.github/renovate.json', 'renovate.json5') && 'renovate',
  anyHas('vercel.json') && 'vercel',
  anyHas('netlify.toml') && 'netlify',
  anyHas('wrangler.toml', 'wrangler.jsonc', 'wrangler.json') && 'cloudflare',
  anyHas('serverless.yml', 'template.yaml') && 'aws-serverless',
].filter(Boolean);

const ui = [
  ...pick(['tailwindcss', 'styled-components', '@emotion/react', 'sass', '@mui/material', '@chakra-ui/react',
    'antd', '@mantine/core', 'daisyui', 'unocss', '@vanilla-extract/css', '@pandacss/dev', 'bootstrap',
    '@headlessui/react', '@base-ui-components/react', '@base-ui/react']),
  ...(Object.keys(deps).some((n) => n.startsWith('@radix-ui/') || n === 'radix-ui') ? ['radix'] : []),
  ...(exists(pkgDir, 'components.json').length ? ['shadcn'] : []),
];

// ---- facts ------------------------------------------------------------------
const gi = gitInfo(pkgDir);
const frameworks = Object.fromEntries([...c.meta, ...c.be, ...c.fe].map((n) => [n, ver(n)]));
const viaHapi = HAPI_PLUGINS.find((n) => deps[n]);
if (viaHapi && !frameworks.hapi && !frameworks['@hapi/hapi']) frameworks['@hapi/hapi'] = `via ${viaHapi}`;
const sideEffects = pick(SIDE_EFFECTS);
const nodePin = pkg.engines?.node ?? rootPkg.engines?.node ?? pkg.volta?.node ?? rootPkg.volta?.node ?? firstLine('.nvmrc', '.node-version');
const next = nextInfo();

// ---- warnings: combinations that are broken or risky, not style ------------------
const lang = deps.typescript || anyHas('tsconfig.json', 'tsconfig.base.json') ? 'ts' : 'js';
const warnings = [];
if (Object.keys(deps).length && !anyHas('node_modules') && !anyHas('.pnp.cjs')) {
  warnings.push(`node_modules missing: checks need a frozen install (${pm}); ask before running it`);
}
const lockPms = [...new Set(lockfiles.map(([, p]) => p))];
if (lockPms.length > 1) warnings.push(`several lockfiles (${lockfiles.map(([f]) => f).join(', ')}): use ${pm} only; ask before deleting one`);
if (pmField && lockPms.length === 1 && lockPms[0] !== pmField) warnings.push(`packageManager is ${pmField} but the lockfile is ${lockPms[0]}`);
const pinMajor = major(nodePin);
const runMajor = major(process.version);
if (pinMajor && /^\D*\d+(\.\d+){0,2}\s*$/.test(String(nodePin)) && pinMajor !== runMajor) {
  warnings.push(`project pins Node ${nodePin}, running ${process.version}: a failing check may be a runtime mismatch`);
}
const NODE_EOL = { 14: '2023-04-30', 16: '2023-09-11', 18: '2025-04-30', 20: '2026-04-30' };
if (pinMajor && NODE_EOL[pinMajor] && Date.now() > Date.parse(NODE_EOL[pinMajor]) && !/^\s*(>|\^)/.test(String(nodePin))) {
  warnings.push(`Node ${pinMajor} is end-of-life since ${NODE_EOL[pinMajor]}`);
}
if (versions.express >= 5 && deps['express-mongo-sanitize']) warnings.push('express-mongo-sanitize rewrites req.query, which is a getter in Express 5: it does not work there');
if (versions.typescript >= 7 && pick(['typescript-eslint', '@typescript-eslint/parser']).length) warnings.push('TypeScript 7 has no compiler API yet: typescript-eslint needs TypeScript 6 (see toolchain.md)');
if (versions.vitest >= 4 && anyHas('vitest.workspace.ts', 'vitest.workspace.js', 'vitest.workspace.mts', 'vitest.workspace.json')) warnings.push('vitest.workspace.* is removed in Vitest 4: use test.projects');
if (versions.eslint >= 10 && lint.includes('eslint-legacy')) warnings.push('ESLint 10 does not read .eslintrc*: only eslint.config.* applies');
if (deps.prisma && deps['@prisma/client'] && major(ver('prisma')) !== major(ver('@prisma/client'))) warnings.push('prisma and @prisma/client majors differ');
if (deps['react-scripts']) warnings.push('Create React App (react-scripts) is deprecated: do not add to it without a plan to migrate');

// ---- routing: which rule files to read --------------------------------------
const has = (...names) => names.some((n) => deps[n]);
const isFront = ['frontend', 'fullstack'].includes(role);
const ROUTES = [
  ['references/backend.md', ['backend', 'cli', 'fullstack'].includes(role)],
  ['references/frontend.md', isFront],
  // TS config, workspaces, publishing and supply-chain gates; plain JS apps get it from the SKILL.md trigger table
  ['references/toolchain.md', lang === 'ts' || Boolean(monorepo) || role === 'library' || pmPolicy.length > 0],
  ['references/side-effects.md', sideEffects.length > 0],
  ['references/stacks/react.md', isFront && has('react', 'next', '@remix-run/react', '@react-router/dev')],
  ['references/stacks/next.md', has('next')],
  ['references/stacks/react-router.md', has('react-router', '@react-router/dev', '@remix-run/react', '@tanstack/react-start')],
  ['references/stacks/vue-nuxt.md', has('vue', 'nuxt')],
  ['references/stacks/svelte.md', has('svelte', '@sveltejs/kit')],
  ['references/stacks/astro.md', has('astro')],
  ['references/stacks/tailwind-shadcn.md', has('tailwindcss') || ui.includes('shadcn')],
  ['references/stacks/express.md', has('express', 'koa')],
  ['references/stacks/fastify.md', has('fastify', '@nestjs/platform-fastify')],
  ['references/stacks/nestjs.md', has('@nestjs/core')],
  ['references/stacks/hapi.md', has('hapi', '@hapi/hapi') || Boolean(viaHapi)],
  ['references/stacks/hono.md', has('hono')],
  ['references/stacks/graphql-trpc.md', has('@trpc/server', 'graphql', '@apollo/server', 'graphql-yoga', 'mercurius')],
  ['references/stacks/prisma.md', has('prisma', '@prisma/client')],
  ['references/stacks/drizzle.md', has('drizzle-orm')],
  ['references/stacks/mongoose.md', has('mongoose')],
  ['references/stacks/typeorm.md', has('typeorm')],
  ['references/stacks/jobs-realtime.md', has('bullmq', 'bull', 'agenda', 'pg-boss', 'node-cron', 'cron', 'node-schedule',
    '@nestjs/schedule', 'croner', 'socket.io', 'ws', '@nestjs/websockets')],
  ['references/stacks/serverless.md', infra.some((x) => ['vercel', 'netlify', 'cloudflare', 'aws-serverless'].includes(x))
    || has('wrangler', '@vercel/node', '@vercel/functions', 'serverless', '@types/aws-lambda', 'aws-lambda', '@netlify/functions')],
  ['references/stacks/payload.md', has('payload', '@payloadcms/next')],
  ['references/stacks/strapi.md', Object.keys(deps).some((n) => n.startsWith('@strapi/'))],
];
const readList = role === 'monorepo-root' ? only(['references/toolchain.md']) : only(ROUTES.filter(([, on]) => on).map(([f]) => f));

out({
  dir: pkgDir,
  name: pkg.name,
  role,
  lang,
  module: pkg.type === 'module' ? 'esm' : 'cjs',
  pm,
  node: { pin: nodePin, running: process.version },
  hint,
  frameworks,
  versions,
  next,
  nestAdapter: pick(['@nestjs/platform-express', '@nestjs/platform-fastify']).map((n) => n.replace('@nestjs/platform-', '')),
  data: pick(DATA),
  cms: pick(['payload', '@payloadcms/next', '@strapi/strapi', '@keystone-6/core', 'directus', '@sanity/client', 'next-sanity']),
  view: pick(['handlebars', 'hbs', 'express-handlebars', '@hapi/vision', 'vision', 'ejs', 'pug', 'nunjucks', '@fastify/view']),
  jobs: pick(['bullmq', 'bull', '@nestjs/bullmq', '@nestjs/bull', 'agenda', 'bee-queue', 'pg-boss', 'cron',
    'node-cron', 'node-schedule', '@nestjs/schedule', 'croner']),
  realtime: pick(['socket.io', 'ws', '@nestjs/websockets', 'uWebSockets.js']),
  validation: pick(['zod', 'joi', 'valibot', 'yup', 'ajv', 'class-validator', '@sinclair/typebox', 'typebox', 'arktype',
    'superstruct', 'io-ts', 'effect', '@t3-oss/env-core', '@t3-oss/env-nextjs', 'envalid']),
  auth: pick(AUTH),
  log: pick(['pino', 'pino-http', 'nestjs-pino', 'winston', 'bunyan', 'consola', '@opentelemetry/api', '@sentry/node']),
  ui,
  i18n: pick(['i18next', 'react-i18next', 'next-intl', 'next-i18next', 'vue-i18n', '@lingui/core', 'react-intl',
    '@formatjs/intl', 'paraglide-js', '@inlang/paraglide-js']),
  state: pick(['@tanstack/react-query', 'swr', '@reduxjs/toolkit', 'redux', 'zustand', 'jotai', 'recoil', 'pinia',
    'mobx', '@apollo/client', 'urql', '@trpc/client', 'vuex', 'xstate', 'nuqs']),
  sideEffects,
  tooling: pick(['vite', 'webpack', 'esbuild', 'tsup', 'tsdown', 'unbuild', 'tsx', 'ts-node', '@swc/core', 'nodemon',
    'turbo', 'nx', 'husky', 'lefthook', 'lint-staged', '@changesets/cli', 'publint', '@arethetypeswrong/cli',
    '@typescript/native-preview']),
  lint,
  tsconfig: tsconfigInfo(),
  tests,
  scripts: pickScripts(pkg),
  rootScripts: root !== pkgDir ? pickScripts(rootPkg) : undefined,
  monorepo,
  pmPolicy: [...new Set(pmPolicy)],
  infra,
  generated: generatedInfo(),
  bundledDocs: bundledDocs(),
  openapi: anyHas('openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.json'),
  envExample: anyHas('.env.example', '.env.sample', '.env.template'),
  git: gi.git,
  instructions: instructionFiles(pkgDir, gi.gitRoot || root),
  warnings,
  skillDir: SKILL_DIR,
  read: readList,
});
