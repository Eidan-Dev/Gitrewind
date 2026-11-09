'use strict';

const { execFileSync } = require('child_process');

// Runs git with explicit arguments (no shell), returns trimmed stdout.
function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function isRepo(cwd = process.cwd()) {
  try {
    return git(['rev-parse', '--is-inside-work-tree'], cwd) === 'true';
  } catch {
    return false;
  }
}

module.exports = { git, isRepo };
