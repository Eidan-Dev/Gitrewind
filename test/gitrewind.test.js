'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { listCandidates, restoreCommit } = require('../src/candidates');
const { parseArgs, ago } = require('../src/cli');

// Builds a repo where a commit was lost with `git reset --hard`.
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitrewind-'));
  const g = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  g('init', '-q');
  g('config', 'user.email', 'test@example.com');
  g('config', 'user.name', 'Test');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'one');
  g('add', '.');
  g('commit', '-q', '-m', 'first');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'two');
  g('commit', '-qam', 'feat: three hours of work');
  const lost = g('rev-parse', 'HEAD');
  g('reset', '-q', '--hard', 'HEAD~1');
  return { dir, g, lost };
}

test('finds a commit lost by git reset --hard', () => {
  const { dir, lost } = makeRepo();
  const shas = listCandidates({ cwd: dir }).map((c) => c.sha);
  assert.ok(shas.includes(lost));
});

test('restore creates rescued branch and leaves HEAD alone', () => {
  const { dir, g, lost } = makeRepo();
  const headBefore = g('rev-parse', 'HEAD');
  const { branch, sha } = restoreCommit(lost.slice(0, 7), dir);

  assert.equal(sha, lost);
  assert.equal(branch, `rescued/${lost.slice(0, 7)}`);
  assert.equal(g('rev-parse', 'HEAD'), headBefore);
  assert.equal(g('rev-parse', branch), lost);
});

test('restore refuses to overwrite an existing rescued branch', () => {
  const { dir, lost } = makeRepo();
  restoreCommit(lost, dir);
  assert.throws(() => restoreCommit(lost, dir), /already exists/);
});

test('restore rejects unknown revisions', () => {
  const { dir } = makeRepo();
  assert.throws(() => restoreCommit('deadbeefdeadbeef', dir), /not a commit/);
});

test('parseArgs validates numeric flags and reads the restore target', () => {
  assert.throws(() => parseArgs(['--hours', 'soon']), /positive integer/);
  assert.equal(parseArgs(['restore', 'abc1234']).target, 'abc1234');
  assert.equal(parseArgs(['--hours', '3']).hours, 3);
});

test('ago formats relative times', () => {
  const now = 1_000_000;
  assert.equal(ago(now - 30, now), '30 seconds ago');
  assert.equal(ago(now - 120, now), '2 minutes ago');
  assert.equal(ago(now - 3600, now), '1 hour ago');
});
