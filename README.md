# gitrewind

<img width="960" height="540" alt="demo-gitrewind" src="https://github.com/user-attachments/assets/b6d12c8c-42c7-44a1-870a-0cf5b9de25d7" />

> A time machine for your git mistakes.

You ran `git reset --hard`. You deleted a branch you still needed. Your rebase went wrong. Your work is not gone, but finding it means digging through `git reflog` and dangling objects by hand.

`gitrewind` lists every commit git still remembers, newest first, and restores the one you pick into a new branch. It never rewrites your history, never moves your current branch, and never touches your working tree.

![gitrewind demo](./docs/demo.gif)

## Install

```bash
npx gitrewind
```

Or install globally:

```bash
npm install -g gitrewind
```

Requires Node.js 18+ and git.

## Usage

```bash
# List recoverable states from the last 7 days
gitrewind

# Only the last 3 hours
gitrewind --hours 3

# Restore a commit into rescued/<short-sha>
gitrewind restore 9d2e7b0
```

## Example

```
$ git reset --hard HEAD~2
$ gitrewind

  ● 5005476  1 second ago    reset: moving to HEAD~2
  ● 79c7391  1 second ago    commit: fix: refresh token expiry
  ● 26c07ea  1 second ago    commit: feat: login form

Restore one with: gitrewind restore <commit>

$ gitrewind restore 79c7391
Restored 79c7391 into branch rescued/79c7391.
Your current branch and working tree were not modified.
```

## How it works

1. Reads `git reflog` to find every position HEAD has pointed to
2. Runs `git fsck --unreachable` to find commits that no branch points to anymore
3. Merges both sources, removes duplicates, and sorts by time
4. `restore` creates `rescued/<short-sha>` at the commit you choose

Everything runs through git itself with explicit arguments. No shell, no network, no config.

## Roadmap

- [ ] Interactive picker
- [ ] Recover deleted stashes by content
- [ ] Undo a restore
- [ ] Shell completion for commit names

## Contributing

Issues and pull requests are welcome. Run `npm test` before opening one.

## License

MIT
