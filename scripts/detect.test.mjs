// Run: node --test scripts/detect.test.mjs (from the skill dir)
// Builds throwaway fixture projects in a temp dir. Routing asserts need the rule files to exist in the skill.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const DETECT = join(dirname(fileURLToPath(import.meta.url)), 'detect.mjs');
const root = mkdtempSync(join(tmpdir(), 'devflow-'));
after(() => rmSync(root, { recursive: true, force: true }));

let n = 0;
/** Create a fixture dir from { 'relative/path': string | object } and return its path. */
function fixture(files) {
  const dir = join(root, `f${n++}`);
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}
const run = (dir) => execFileSync(process.execPath, [DETECT, dir], { encoding: 'utf8' });
const detect = (dir) => JSON.parse(run(dir));
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' });

describe('role, frameworks and routing', () => {
  it('hapi 16 under its unscoped name is a backend and loads hapi and mongoose rules', () => {
    const r = detect(fixture({ 'package.json': { name: 'a', dependencies: { hapi: '16.6.0', mongoose: '^5.9.0' } } }));
    assert.equal(r.role, 'backend');
    assert.ok('hapi' in r.frameworks);
    assert.equal(r.versions.mongoose, 5);
    assert.ok(r.read.includes('references/stacks/hapi.md'));
    assert.ok(r.read.includes('references/stacks/mongoose.md'));
  });

  it('a hapi app that only lists plugins (via @hapi/glue) is still recognised as hapi', () => {
    const r = detect(fixture({ 'package.json': { name: 'g', dependencies: { '@hapi/glue': '^9', '@hapi/vision': '^7', handlebars: '^4' } } }));
    assert.equal(r.role, 'backend');
    assert.match(r.frameworks['@hapi/hapi'], /^via /);
    assert.ok(r.read.includes('references/stacks/hapi.md'));
  });

  it('a ws package is a backend signal and loads the jobs/realtime rules', () => {
    const r = detect(fixture({ 'package.json': { name: 'sock', dependencies: { ws: '^8', zod: '^3' } } }));
    assert.equal(r.role, 'backend');
    assert.deepEqual(r.realtime, ['ws']);
    assert.ok(r.read.includes('references/stacks/jobs-realtime.md'));
  });

  it('a shared library that merely depends on jsonwebtoken stays a library and gets toolchain, not backend, rules', () => {
    const r = detect(fixture({ 'package.json': { name: 'shared', main: 'dist/index.js', dependencies: { zod: '^3', jsonwebtoken: '^9' } } }));
    assert.equal(r.role, 'library');
    assert.deepEqual(r.read, ['references/toolchain.md']);
  });

  it('a start script without a known framework is a backend with a hint to read the entry point', () => {
    const r = detect(fixture({ 'package.json': { name: 'bot', scripts: { start: 'node bot.js' }, dependencies: { axios: '^1' } } }));
    assert.equal(r.role, 'backend');
    assert.match(r.hint, /read the entry point/);
    assert.deepEqual(r.read, ['references/backend.md']);
    assert.equal(r.pm, 'npm');
    assert.match(r.warnings[0], /node_modules missing/);
  });

  it('a package that moves money or sends messages loads the side-effects rules', () => {
    const r = detect(fixture({ 'package.json': { name: 'pay', scripts: { start: 'node i.js' }, dependencies: { stripe: '^18', nodemailer: '^6' } } }));
    assert.deepEqual(r.sideEffects, ['stripe', 'nodemailer']);
    assert.ok(r.read.includes('references/side-effects.md'));
  });

  it('next is fullstack and loads role, React, Next and Tailwind rules', () => {
    const r = detect(fixture({
      'package.json': { name: 'w', dependencies: { next: '^16.0.0', react: '^19', tailwindcss: '^4' } },
      'app/page.tsx': '',
      'proxy.ts': '',
      'next.config.ts': 'export default { cacheComponents: true, reactCompiler: true }',
    }));
    assert.equal(r.role, 'fullstack');
    for (const f of ['references/backend.md', 'references/frontend.md', 'references/stacks/react.md',
      'references/stacks/next.md', 'references/stacks/tailwind-shadcn.md']) assert.ok(r.read.includes(f), f);
    assert.deepEqual(r.next, { router: 'app', interceptor: 'proxy', cacheComponents: true, reactCompiler: true });
    assert.equal(r.bundledDocs, undefined);
  });

  it('reads majors from the installed package before the package.json range', () => {
    const r = detect(fixture({
      'package.json': { name: 'e', dependencies: { express: '^4.18.0' } },
      'node_modules/express/package.json': { version: '5.1.0' },
    }));
    assert.equal(r.versions.express, 5);
    assert.equal(r.frameworks.express, '5.1.0');
  });

  it('lists docs shipped inside installed packages', () => {
    const r = detect(fixture({
      'package.json': { name: 'd', dependencies: { next: '16.2.0', react: '19.2.0', '@acme/ui': '1.0.0' } },
      'node_modules/next/dist/docs/index.md': '',
      'node_modules/@acme/ui/AGENTS.md': '',
    }));
    assert.deepEqual(r.bundledDocs, ['node_modules/next/dist/docs', 'node_modules/@acme/ui/AGENTS.md']);
  });
});

describe('monorepos', () => {
  it('a pnpm-workspace.yaml with only settings is not a monorepo, but its policy keys are reported', () => {
    const r = detect(fixture({
      'package.json': { name: 'solo', scripts: { start: 'node i.js' } },
      'pnpm-workspace.yaml': 'allowBuilds:\n  esbuild: true\nminimumReleaseAge: 1440\n',
    }));
    assert.equal(r.monorepo, undefined);
    assert.deepEqual(r.pmPolicy, ['pnpm-workspace:allowBuilds', 'pnpm-workspace:minimumReleaseAge']);
  });

  it("expands workspace globs, reports each package, and the root reads only toolchain rules", () => {
    const dir = fixture({
      'package.json': { name: 'ws' },
      'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - 'lib-*'\n",
      'apps/api/package.json': { name: '@ws/api', dependencies: { fastify: '^5' }, devDependencies: { vitest: '^2' } },
      'apps/web/package.json': { name: '@ws/web', dependencies: { react: '^19' } },
      'lib-core/package.json': { name: '@ws/core', main: 'i.js' },
    });
    const r = detect(dir);
    assert.equal(r.role, 'monorepo-root');
    assert.deepEqual(r.monorepo.packages, ['apps/api [@ws/api] backend (fastify) vitest', 'apps/web [@ws/web] frontend (react)', 'lib-core [@ws/core] lib']);
    assert.deepEqual(r.read, ['references/toolchain.md']);
  });

  it('a package inside a workspace sees the workspace root', () => {
    const dir = fixture({
      'package.json': { name: 'ws', workspaces: ['packages/*'] },
      'packages/x/package.json': { name: 'x', dependencies: { express: '^5' } },
    });
    const r = detect(join(dir, 'packages/x'));
    assert.equal(r.role, 'backend');
    assert.equal(r.monorepo.root, '../..');
    assert.ok(r.read.includes('references/stacks/express.md'));
  });
});

describe('tests', () => {
  it('counts test files in the project but not in vendored asset folders', () => {
    const r = detect(fixture({
      'package.json': { name: 't', dependencies: { express: '^4' }, devDependencies: { jest: '^29' } },
      'test/a.test.js': '',
      'src/b.spec.js': '',
      'assets/components/lodash/test/c.js': '',
    }));
    assert.equal(r.tests.runner, 'jest');
    assert.equal(r.tests.files, 2);
  });

  it('knows node:test and ignores the npm default "no test specified" script', () => {
    const a = detect(fixture({ 'package.json': { name: 'n', main: 'i.js', scripts: { test: 'node --test test/' } } }));
    assert.equal(a.tests.runner, 'node:test');
    const b = detect(fixture({ 'package.json': { name: 'd', main: 'i.js', scripts: { test: 'echo "Error: no test specified" && exit 1' } } }));
    assert.equal(b.scripts, undefined);
    assert.equal(b.tests.runner, 'none');
  });
});

describe('config files', () => {
  it('parses tsconfig with comments, trailing commas, a URL string and a relative extends', () => {
    const r = detect(fixture({
      'package.json': { name: 'c', main: 'i.js', devDependencies: { typescript: '^6' } },
      'tsconfig.base.json': '{ "compilerOptions": { "strict": true, "module": "nodenext" } }',
      'tsconfig.json': '// app\n{ "$schema": "https://json.schemastore.org/tsconfig", "extends": "./tsconfig.base.json",\n'
        + '  /* opts */ "compilerOptions": { "moduleResolution": "nodenext", "baseUrl": ".", }, }',
    }));
    assert.deepEqual(r.tsconfig, { file: 'tsconfig.json', strict: true, module: 'nodenext', moduleResolution: 'nodenext', baseUrl: true });
  });

  it('reports .npmrc policy key names and never their values', () => {
    const dir = fixture({
      'package.json': { name: 'p', main: 'i.js' },
      '.npmrc': 'ignore-scripts=true\n//registry.npmjs.org/:_authToken=SECRET-TOKEN\nmin-release-age=3\n',
    });
    const raw = run(dir);
    assert.ok(!raw.includes('SECRET-TOKEN'));
    assert.deepEqual(JSON.parse(raw).pmPolicy, ['.npmrc:ignore-scripts', '.npmrc:min-release-age']);
  });

  it('names the generated Prisma client and its output path', () => {
    const r = detect(fixture({
      'package.json': { name: 'db', main: 'i.js', dependencies: { '@prisma/client': '^7' }, devDependencies: { prisma: '^7' } },
      'prisma/schema.prisma': 'generator client {\n  provider = "prisma-client"\n  output   = "../src/generated/prisma"\n}\n',
    }));
    assert.deepEqual(r.generated, ['prisma client (prisma-client -> ../src/generated/prisma)']);
    assert.ok(r.read.includes('references/stacks/prisma.md'));
  });

  it('warns about broken combinations', () => {
    const r = detect(fixture({
      'package.json': { name: 'x', dependencies: { express: '^5.1.0', 'express-mongo-sanitize': '^2' }, devDependencies: { vitest: '^4' } },
      'package-lock.json': '{}',
      'pnpm-lock.yaml': '',
      'vitest.workspace.ts': '',
      'node_modules/.keep': '',
    }));
    assert.equal(r.warnings.length, 3);
    assert.match(r.warnings[0], /several lockfiles/);
    assert.match(r.warnings[1], /express-mongo-sanitize/);
    assert.match(r.warnings[2], /vitest\.workspace/);
  });
});

describe('git and instruction files', () => {
  it('normalises a GitHub ssh remote and reads a ticket key from the branch', () => {
    const dir = fixture({ 'package.json': { name: 'g', main: 'i.js' } });
    git(dir, 'init', '-q', '-b', 'feature/ABC-123-add-field');
    git(dir, 'remote', 'add', 'origin', 'git@github.com:acme/repo-a.git');
    const r = detect(dir);
    assert.equal(r.git.host, 'github');
    assert.equal(r.git.owner, 'acme');
    assert.equal(r.git.repo, 'repo-a');
    assert.equal(r.git.ticket, 'ABC-123');
  });

  it('parses https remotes with credentials and nested GitLab groups', () => {
    const a = fixture({ 'package.json': { name: 'g', main: 'i.js' } });
    git(a, 'init', '-q', '-b', 'main');
    git(a, 'remote', 'add', 'origin', 'https://someone@bitbucket.org/team/repo-b.git');
    const ra = detect(a);
    assert.deepEqual([ra.git.host, ra.git.owner, ra.git.repo, ra.git.ticket], ['bitbucket', 'team', 'repo-b', undefined]);

    const b = fixture({ 'package.json': { name: 'g', main: 'i.js' } });
    git(b, 'init', '-q', '-b', 'main');
    git(b, 'remote', 'add', 'origin', 'https://gitlab.com/group/sub/repo-c.git');
    const rb = detect(b);
    assert.deepEqual([rb.git.host, rb.git.owner, rb.git.repo], ['gitlab', 'group/sub', 'repo-c']);
  });

  it('collects agent instruction files from the package up to the git root, not above it', () => {
    const dir = fixture({
      'AGENTS.md': 'outside the repo',
      'repo/AGENTS.md': '',
      'repo/.cursor/rules/x.mdc': '',
      'repo/.github/copilot-instructions.md': '',
      'repo/pkg/package.json': { name: 'p', main: 'i.js' },
      'repo/pkg/CLAUDE.md': '',
    });
    git(join(dir, 'repo'), 'init', '-q');
    const r = detect(join(dir, 'repo/pkg'));
    assert.deepEqual(r.instructions, ['CLAUDE.md', '../AGENTS.md', '../.cursor/rules', '../.github/copilot-instructions.md']);
  });
});

describe('folders without package.json', () => {
  it('reports found:false for a folder with no manifest and no infra files', () => {
    const r = detect(fixture({ 'notes.txt': 'x' }));
    assert.equal(r.found, false);
    assert.equal(r.role, undefined);
    assert.deepEqual(r.read ?? [], []);
  });

  it('recognises a docker compose folder as infra and routes the infra rules', () => {
    const r = detect(fixture({ 'docker-compose.yml': 'services: {}\n' }));
    assert.equal(r.found, false);
    assert.equal(r.role, 'infra');
    assert.deepEqual(r.infra, ['docker-compose.yml']);
    assert.deepEqual(r.read, ['references/infra.md']);
  });

  it('reports a clear error for a path that does not exist', () => {
    const r = detect(join(root, 'does-not-exist'));
    assert.equal(r.found, false);
    assert.match(r.error, /path not found/);
  });
});
