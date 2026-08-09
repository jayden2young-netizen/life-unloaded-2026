#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = __dirname;
const RUNNER = path.join(ROOT, 'tests', 'run-checks.cjs');

function help() {
  return `Usage:
  node smoke.js             Core smoke: contracts + browser regression
  node smoke.js --fast      Fast smoke: syntax only
  node smoke.js --full      Full release regression
  node smoke.js <options>   Forward advanced options to tests/run-checks.cjs

Examples:
  node smoke.js --list
  node smoke.js --changed main --dry-run
  node smoke.js --changed main --scope education`;
}

const input = process.argv.slice(2);

if (input[0] === '--help' || input[0] === '-h') {
  console.log(help());
  process.exit(0);
}

let args;
if (input.length === 0) {
  args = ['--profile', 'core'];
} else if (input[0] === '--fast') {
  args = ['--profile', 'fast', ...input.slice(1)];
} else if (input[0] === '--full') {
  args = ['--profile', 'full', ...input.slice(1)];
} else {
  args = input;
}

const result = spawnSync(process.execPath, [RUNNER, ...args], {
  cwd: ROOT,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[smoke] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
