'use strict';

const { git } = require('./git');

const SEP = '\x1f';

// Every position HEAD has pointed to, from the reflog.
function reflogEntries(cwd) {
  let out;
  try {
    out = git(['reflog', '--format=%H%x1f%ct%x1f%gs'], cwd);
  } catch {
    return [];
  }
  return out.split('\n').filter(Boolean).map((line) => {
    const [sha, ts, subject] = line.split(SEP);
    return { sha, time: Number(ts), subject: subject || '(no message)', source: 'reflog' };
  });
}

// Commits that no branch, tag or reflog points to anymore.
function unreachableCommits(cwd) {
  let out;
  try {
    out = git(['fsck', '--no-reflogs', '--unreachable', '--no-progress'], cwd);
  } catch (err) {
    out = String(err.stdout || '');
  }
  const shas = [];
  for (const line of out.split('\n')) {
    const m = /^unreachable commit ([0-9a-f]{40,64})$/.exec(line.trim());
    if (m) shas.push(m[1]);
  }
  return shas.map((sha) => {
    const [ts, subject] = git(['show', '-s', '--format=%ct%x1f%s', sha], cwd).split(SEP);
    return { sha, time: Number(ts), subject: subject || '(no message)', source: 'unreachable' };
  });
}

function listCandidates({ hours = 168, cwd = process.cwd(), now = Date.now() / 1000 } = {}) {
  const cutoff = now - hours * 3600;
  const seen = new Map();
  for (const c of [...reflogEntries(cwd), ...unreachableCommits(cwd)]) {
    if (c.time < cutoff) continue;
    if (!seen.has(c.sha)) seen.set(c.sha, c);
  }
  return [...seen.values()].sort((a, b) => b.time - a.time);
}

// Creates rescued/<short-sha> pointing at the commit. Never moves HEAD or other branches.
function restoreCommit(target, cwd = process.cwd()) {
  let sha;
  try {
    sha = git(['rev-parse', '--verify', '--quiet', `${target}^{commit}`], cwd);
  } catch {
    throw new Error(`not a commit: ${target}`);
  }
  const branch = `rescued/${sha.slice(0, 7)}`;
  try {
    git(['branch', branch, sha], cwd);
  } catch {
    throw new Error(`branch ${branch} already exists`);
  }
  return { branch, sha };
}

module.exports = { listCandidates, restoreCommit };
