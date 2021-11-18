# @thi.ng/monopub

Lightweight & fast monorepo publish/release/changelog manager to automate
releases using nothing more than [Conventional
Commits](https://conventionalcommits.org/).

## Status

Early stage MVP - not much to see yet...

Currently implemented:

- [x] Detailed Git commit parsing, filtering & analysis
  - [x] Filter by file ext
  - [x] Package name aliases (to assign commits from old pkg names)
- [x] Computing packages touched by recent commits (or allow forcing all)
- [x] Dependency graph construction for monorepo internal packages (incl. topological sort)
- [x] Computing new package versions (based on Conventional Commit types used)
- [x] Selective changelog creation (as Markdown files)
  - [x] Commit type config
- [x] Repo/publish config via dotenv
- [x] Update package files w/ version bumps
  - [x] Update/bump deps in transitive dependents
- [x] Commit updated package & changelog files
- [x] Create & add release tags
- [x] Push to git remote
- [x] Inject `gitHead` into published pkg.json files
- [x] Publish to registry
- [x] Reset git head post-publish
- [ ] Add pre-checks
  - [ ] On clean release branch?
  - [ ] Valid npm login/auth?

## Goals & Non-goals

The current aim of this project is to produce an as minimal as possible release
workflow suitable for the [thi.ng/umbrella monorepo](https://thi.ng/umbrella)
(160+ TypeScript packages). There will be configuration options to allow this
tool to be used with other (similar) monorepo setups, however there's no desire
to go down the usual route in JS-land of adding 100s of overly complicated
options suitable for seemingly all use cases and then none...

## Usage

```bash
git clone https://github.com/thi-ng/monopub.git

cd monopub

yarn install
yarn build

bin/monopub --help
```

```text
 █ █   █           │
██ █               │
 █ █ █ █   █ █ █ █ │ @thi.ng/monopub 0.0.1
 █ █ █ █ █ █ █ █ █ │ Monorepo publish/release/changelog manager
                 █ │
               █ █ │

usage: monopub CMD [OPTS] ...
       monopub [CMD] --help


Available commands:

    changelog ∷ Create/update changelogs
    release   ∷ Prepare and execute full release of all touched packages
    version   ∷ Compute & apply version bumps

Common:

-A key=val, --alias key=val         [multiple] Alias pkg names (old=new) (default: {})
--ext EXT                           [multiple] File types to consider for changes (comma separated) (default: [".+"])
-p PATH, --repo-path PATH           Monorepo local path (default: "<missing>")
-u URL, --repo-url URL              Monorepo remote URL (default: "<missing>")
-r PATH, --root PATH                Relative package root dir in repo (default: "packages")
-s SCOPE, --scope SCOPE             Package scope (default: "<missing>")
```

### Command: changelog

Create/update changelogs

```text
Flags:

-a, --all                           Process all packages, not just unreleased
--dry-run                           Dry run

Main:

-b NAME, --branch NAME              Remote Git branch for package links in changelog (default: "main")
-cc TYPE, --cc-types TYPE           [multiple] Only consider given Conventional Commit types for determining changes: "feat",
                                    "fix", "perf", "refactor", "build", "docs", "chore" (default: ["feat","fix","refactor","perf"])
--dump-spec PATH                    Write release spec to JSON file
-o PATH, --out-dir PATH             Output root dir (default: --repo-path)
```

### Command: version

Compute & apply version bumps

```text
Flags:

-a, --all                           Process all packages, not just unreleased
--dry-run                           Dry run

Main:

--dump-spec PATH                    Write release spec to JSON file
-o PATH, --out-dir PATH             Output root dir (default: --repo-path)
```

### Command: release

Prepare and execute full release of all touched packages

```text
Flags:

-a, --all                           Process all packages, not just unreleased
--dry-run                           Dry run

Main:

-cc TYPE, --cc-types TYPE           [multiple] Only consider given Conventional Commit types for determining changes: "feat",
                                    "fix", "perf", "refactor", "build", "docs", "chore" (default: ["feat","fix","refactor","pe
                                    rf"])
-cb NAME, --changelog-branch NAME   Remote Git branch for package links in changelog (default: "main")
--dump-spec PATH                    Write release spec to JSON file
-script CMD, --publish-script CMD   Publish script alias name (default: "pub")
-rb NAME, --release-branch NAME     Remote branch name for publishing releases (default: "main")
```

## License

&copy; 2021 Karsten Schmidt // Apache Software License 2.0