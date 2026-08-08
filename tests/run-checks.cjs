#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

const CHECKS = Object.freeze({
  correctness: 'tests/v6-correctness-guardrails.cjs',
  browser: 'tests/v5-browser-smoke.cjs',
  employment: 'tests/v5-employment-language-smoke.cjs',
  'family-education': 'tests/v5-family-education-smoke.cjs',
  'full-track': 'tests/v5-full-track-smoke.cjs',
  'university-career': 'tests/v5-university-career-smoke.cjs',
  cards: 'tests/v6-card-interaction-smoke.cjs',
  debt: 'tests/v6-debt-enforcement-smoke.cjs',
  'runtime-equivalence': 'tests/v6-runtime-equivalence-smoke.cjs',
});

const CHECK_ORDER = Object.freeze(Object.keys(CHECKS));

const PROFILES = Object.freeze({
  syntax: [],
  fast: ['correctness'],
  core: ['correctness', 'browser'],
  cards: ['correctness', 'cards'],
  debt: ['correctness', 'debt'],
  family: ['correctness', 'family-education'],
  education: ['correctness', 'family-education', 'university-career'],
  career: ['correctness', 'employment', 'university-career'],
  episodes: ['correctness', 'browser', 'full-track'],
  'runtime-refactor': ['correctness', 'browser', 'runtime-equivalence'],
  full: CHECK_ORDER,
});

const TEST_PATH_TO_CHECK = new Map(
  Object.entries(CHECKS).map(([name, file]) => [file, name])
);
TEST_PATH_TO_CHECK.set(
  'tests/fixtures/v0.6.0-runtime-equivalence.json',
  'runtime-equivalence'
);

function usage() {
  return `Usage:
  node tests/run-checks.cjs --profile <name[,name...]>
  node tests/run-checks.cjs --changed [base] [--scope <name[,name...]>]
  node tests/run-checks.cjs --list

Options:
  --profile   Run one or more explicit profiles.
  --changed   Infer clear profiles from Git changes; base defaults to main.
  --scope     Resolve ambiguous --changed files with explicit profiles.
  --dry-run   Print the selected plan without running it.
  --list      List available profiles.
  --help      Show this help.

No arguments never run the full suite. The full profile must be explicit.`;
}

function splitNames(value) {
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const result = {
    profiles: [],
    scopes: [],
    changed: false,
    base: 'main',
    dryRun: false,
    list: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile' || arg === '--scope') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a profile name`);
      }
      result[arg === '--profile' ? 'profiles' : 'scopes'].push(...splitNames(value));
      index += 1;
    } else if (arg === '--changed') {
      result.changed = true;
      const value = argv[index + 1];
      if (value && !value.startsWith('--')) {
        result.base = value;
        index += 1;
      }
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--list') {
      result.list = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (result.changed && result.profiles.length) {
    throw new Error('--changed and --profile cannot be used together');
  }
  if (result.scopes.length && !result.changed) {
    throw new Error('--scope requires --changed');
  }
  return result;
}

function assertProfiles(names) {
  for (const name of names) {
    if (!Object.hasOwn(PROFILES, name)) {
      throw new Error(`unknown profile "${name}"`);
    }
  }
}

function gitLines(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`
    );
  }
  return result.stdout
    .split(/\r?\n/)
    .map(item => item.trim().replaceAll('\\', '/'))
    .filter(Boolean);
}

function changedPaths(base) {
  return Array.from(
    new Set([
      ...gitLines(['diff', '--name-only', `${base}...HEAD`]),
      ...gitLines(['diff', '--name-only']),
      ...gitLines(['diff', '--cached', '--name-only']),
      ...gitLines(['ls-files', '--others', '--exclude-standard']),
    ])
  ).sort();
}

function isDocumentation(pathname) {
  return (
    pathname === '.gitignore' ||
    pathname.endsWith('.md') ||
    pathname.startsWith('roadmap/') ||
    pathname.startsWith('docs/')
  );
}

function inferChangedPlan(paths) {
  const profiles = new Set();
  const directChecks = new Set();
  const ambiguous = new Set();
  let generatedDataChanged = false;

  for (const pathname of paths) {
    if (isDocumentation(pathname)) continue;

    if (pathname === 'data.json') {
      generatedDataChanged = true;
      continue;
    }

    if (TEST_PATH_TO_CHECK.has(pathname)) {
      directChecks.add(TEST_PATH_TO_CHECK.get(pathname));
      continue;
    }
    if (pathname === 'tests/run-checks.cjs') {
      profiles.add('fast');
      continue;
    }
    if (pathname.startsWith('tests/')) {
      ambiguous.add(pathname);
      continue;
    }

    if (
      pathname === 'runtime-content-contract.mjs' ||
      pathname.startsWith('content/zh-CN/tracks/health') ||
      pathname.startsWith('content/zh-CN/tracks/habits') ||
      pathname.startsWith('content/zh-CN/tracks/leisure')
    ) {
      profiles.add('fast');
      continue;
    }

    if (
      pathname === 'content/zh-CN/cards.mjs' ||
      pathname === 'content/zh-CN/card-interactions.mjs'
    ) {
      profiles.add('cards');
      continue;
    }

    if (pathname === 'content/zh-CN/tracks/education.mjs') {
      profiles.add('education');
      continue;
    }

    if (
      pathname === 'content/zh-CN/tracks/employment.mjs' ||
      pathname === 'content/zh-CN/tracks/public.mjs' ||
      pathname === 'content/zh-CN/tracks/remote.mjs' ||
      pathname === 'content/zh-CN/tracks/business.mjs'
    ) {
      profiles.add('career');
      continue;
    }

    if (
      pathname === 'content/zh-CN/tracks/children.mjs' ||
      pathname === 'content/zh-CN/tracks/partnership.mjs'
    ) {
      profiles.add('family');
      continue;
    }

    if (pathname === 'content/zh-CN/tracks/finance.mjs') {
      profiles.add('debt');
      continue;
    }

    if (pathname === 'content/zh-CN/tracks/later.mjs') {
      profiles.add('episodes');
      continue;
    }

    if (pathname === 'content/zh-CN/tracks/housing.mjs') {
      profiles.add('episodes');
      profiles.add('debt');
      continue;
    }

    if (
      pathname === 'index.html' ||
      pathname === 'style.css' ||
      pathname === 'content/zh-CN/ui.mjs'
    ) {
      profiles.add('core');
      continue;
    }

    if (
      pathname === 'game.js' ||
      pathname === 'tools/generate-v5-data.mjs' ||
      pathname === 'content/zh-CN/tracks/index.mjs' ||
      pathname === 'content/zh-CN/tracks/helpers.mjs'
    ) {
      ambiguous.add(pathname);
      continue;
    }

    if (/\.(?:js|mjs|cjs|json|html|css)$/.test(pathname)) {
      ambiguous.add(pathname);
    }
  }

  if (generatedDataChanged && profiles.size === 0 && directChecks.size === 0) {
    ambiguous.add('data.json');
  }

  return {
    profiles: Array.from(profiles),
    directChecks: Array.from(directChecks),
    ambiguous: Array.from(ambiguous),
  };
}

function resolveChecks(profileNames, directChecks = []) {
  assertProfiles(profileNames);
  const selected = new Set(directChecks);
  for (const profile of profileNames) {
    for (const check of PROFILES[profile]) selected.add(check);
  }
  return CHECK_ORDER.filter(check => selected.has(check));
}

function walkScripts(directory, output) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const pathname = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkScripts(pathname, output);
    } else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) {
      output.push(pathname);
    }
  }
}

function syntaxFiles() {
  const files = [
    path.join(ROOT, 'game.js'),
    path.join(ROOT, 'runtime-content-contract.mjs'),
  ];
  walkScripts(path.join(ROOT, 'content'), files);
  walkScripts(path.join(ROOT, 'tools'), files);
  walkScripts(path.join(ROOT, 'tests'), files);
  return Array.from(new Set(files.filter(fs.existsSync))).sort();
}

function runNode(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`node ${args.join(' ')} failed (${signal || code})`));
    });
  });
}

async function runSyntaxChecks() {
  const files = syntaxFiles();
  for (const file of files) {
    await runNode(['--check', file]);
  }
  console.log(`[syntax] passed ${files.length} files`);
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    }[extension] || 'application/octet-stream'
  );
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, 'http://127.0.0.1').pathname
      );
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    if (pathname === '/') pathname = '/index.html';

    const file = path.resolve(ROOT, `.${pathname}`);
    const relative = path.relative(ROOT, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentType(file),
      });
      fs.createReadStream(file).pipe(response);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/?debug=1`,
      });
    });
  });
}

function stopStaticServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

function printPlan({ profiles, checks, paths, ambiguous, dryRun }) {
  console.log(`profiles: ${profiles.length ? profiles.join(', ') : 'syntax'}`);
  console.log(`checks: syntax${checks.length ? `, ${checks.join(', ')}` : ''}`);
  if (paths) console.log(`changed files: ${paths.length}`);
  if (ambiguous?.length) {
    console.log(`explicit scope accepted for: ${ambiguous.join(', ')}`);
  }
  if (dryRun) console.log('dry-run: no checks executed');
}

async function execute(checks) {
  await runSyntaxChecks();
  if (!checks.length) return;

  const { server, url } = await startStaticServer();
  console.log(`[server] ${url}`);
  try {
    for (const check of checks) {
      const started = Date.now();
      console.log(`[${check}] ${CHECKS[check]}`);
      await runNode([path.join(ROOT, CHECKS[check])], {
        env: { LIFE_URL: url },
      });
      console.log(`[${check}] passed in ${Date.now() - started}ms`);
    }
  } finally {
    await stopStaticServer(server);
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.list) {
    for (const [name, checks] of Object.entries(PROFILES)) {
      console.log(`${name}: ${checks.length ? checks.join(', ') : 'syntax only'}`);
    }
    return;
  }
  if (!args.changed && args.profiles.length === 0) {
    throw new Error(usage());
  }

  let profiles = args.profiles;
  let checks;
  let paths;
  let ambiguous = [];

  if (args.changed) {
    assertProfiles(args.scopes);
    paths = changedPaths(args.base);
    const inferred = inferChangedPlan(paths);
    ambiguous = inferred.ambiguous;
    if (ambiguous.length && args.scopes.length === 0) {
      throw new Error(
        `ambiguous changed files require --scope: ${ambiguous.join(', ')}`
      );
    }
    profiles = Array.from(new Set([...inferred.profiles, ...args.scopes]));
    checks = resolveChecks(profiles, inferred.directChecks);
  } else {
    checks = resolveChecks(profiles);
  }

  printPlan({ profiles, checks, paths, ambiguous, dryRun: args.dryRun });
  if (!args.dryRun) await execute(checks);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  CHECKS,
  PROFILES,
  changedPaths,
  inferChangedPlan,
  parseArgs,
  resolveChecks,
};
