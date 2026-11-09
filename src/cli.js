'use strict';

const { isRepo } = require('./git');
const { listCandidates, restoreCommit } = require('./candidates');

const HELP = `gitrewind - recover commits that git still remembers

Usage:
  gitrewind                    list recoverable states (last 7 days)
  gitrewind restore <commit>   create rescued/<commit> pointing at that commit

Options:
  --hours N    look back N hours (default: 168)
  --limit N    show at most N states (default: 20)
  -h, --help   show this help

Your current branch and working tree are never modified.`;

function positiveInt(value, flag) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${flag} expects a positive integer`);
  return n;
}

function parseArgs(argv) {
  const opts = { command: 'list', hours: 168, limit: 20, target: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'restore') opts.command = 'restore';
    else if (a === '--hours') opts.hours = positiveInt(argv[++i], '--hours');
    else if (a === '--limit') opts.limit = positiveInt(argv[++i], '--limit');
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (!a.startsWith('-') && opts.command === 'restore' && !opts.target) opts.target = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
}

function ago(ts, now = Date.now() / 1000) {
  const seconds = Math.max(0, Math.round(now - ts));
  const units = [[86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
  for (const [size, name] of units) {
    if (seconds >= size || size === 1) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return '';
}

function run(argv, log = console.log, err = console.error, cwd = process.cwd()) {
  const opts = parseArgs(argv);

  if (opts.help) {
    log(HELP);
    return 0;
  }

  if (!isRepo(cwd)) {
    err('gitrewind: not inside a git repository');
    return 2;
  }

  if (opts.command === 'restore') {
    if (!opts.target) {
      err('gitrewind: restore needs a commit, e.g. gitrewind restore 9d2e7b0');
      return 2;
    }
    const { branch, sha } = restoreCommit(opts.target, cwd);
    log(`Restored ${sha.slice(0, 7)} into branch ${branch}.`);
    log('Your current branch and working tree were not modified.');
    return 0;
  }

  const states = listCandidates({ hours: opts.hours, cwd }).slice(0, opts.limit);
  if (states.length === 0) {
    log(`No recoverable states in the last ${opts.hours} hours.`);
    return 0;
  }

  for (const s of states) {
    log(`  ● ${s.sha.slice(0, 7)}  ${ago(s.time).padEnd(15)} ${s.subject}`);
  }
  log('\nRestore one with: gitrewind restore <commit>');
  return 0;
}

module.exports = { run, parseArgs, ago };
