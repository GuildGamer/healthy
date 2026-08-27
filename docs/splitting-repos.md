# Splitting deployables out of the monorepo

The monorepo is the default. When access control, CI scoping, or release cadence
require a separate GitHub repository, use the escape hatch:

```bash
./scripts/split-repos.sh mobile   # or web | api
```

## What it does

1. Clones this repo into a temporary directory (original stays untouched).
2. Runs `git filter-repo --subdirectory-filter` so `apps/<name>` becomes the new root.
3. Prints the path to the standalone repo and suggested remote push commands.

## Prerequisites

- [`git-filter-repo`](https://github.com/newren/git-filter-repo) (`brew install git-filter-repo`)

## After a split

- Publish shared packages (`@product/contract`, `@product/client`, `@product/db`, `@product/brand`) to a private registry, **or** keep them in the monorepo and consume via git/npm until you extract them too.
- Point CI, EAS, and Render/AWS configs at the new remotes.
- Prefer extracting only when a hard requirement appears — splitting later is cheap; coordinating contracts across repos from day one is not.
