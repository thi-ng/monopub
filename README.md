# @thi.ng/monopub

Lightweight, simple & fast monorepo publish/release/changelog manager to
automate releases using nothing more than [Conventional
Commits](https://conventionalcommits.org/).

## Status

**stable** - used in production

Currently implemented:

-   [x] Detailed Git commit parsing, filtering & analysis
    -   [x] Filter by file ext
    -   [x] Package name aliases (to assign commits from old pkg names)
-   [x] Computing packages touched by recent commits (or allow forcing all)
-   [x] Dependency graph construction for monorepo internal packages (incl. topological sort)
-   [x] Computing new package versions (based on Conventional Commit types used)
-   [x] Selective changelog creation (as Markdown files)
    -   [x] Commit type config
-   [x] Repo/publish config via dotenv
-   [x] Update package files w/ version bumps
    -   [x] Update/bump deps in transitive dependents
    -   [x] Update `yarn.lock` prior to 'publish' commit
-   [x] Commit updated package, yarn.lock & changelog files
-   [x] Create & add release tags
-   [x] Push to git remote
-   [x] Inject `gitHead` into published `package.json` files
-   [x] Publish to registry
-   [x] Reset git head post-publish
-   [x] Add pre-checks
    -   [x] On clean release branch?
    -   [ ] Valid npm login/auth?
    -   [ ] Research granular NPM token creation

## Goals & Non-goals

The original aim of this project was to produce an as minimal as possible
release workflow suitable for the [thi.ng/umbrella
monorepo](https://thi.ng/umbrella) (currently ~210 TypeScript
projects/packages). Over the past 2+ years, this tool has been reliably used to
handle hundreds of releases (tens of thousands if you count individual package
releases) and so I consider this goal reached. The tool is also a magnitude
faster than my previous user experience with Lerna. Version analysis, version
bumping and changelog generation (all Conventional Commits based) for all ~210
packages in thi.ng/umbrella only takes ~2-3 seconds (max), unlike Lerna which
regularly took 30+ secs for the same tasks (and produced worse changelogs)...

There are configuration options to allow this project being used with other
(similarly structured) monorepo setups, however there's no desire to go down the
usual route in JS-land of adding hundreds of overly complicated options suitable
for seemingly all use cases and then none...

If you're interested in utilizing this tool with your repo, but not sure how,
please reach out via the issue tracker...

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
 █ █ █ █   █ █ █ █ │ @thi.ng/monopub 1.0.0
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
--indent VAL                        Indentation for generated JSON files: "number", "tab" (default: "\t")
-p PATH, --repo-path PATH           Monorepo local path (default: "<missing>")
-u URL, --repo-url URL              Monorepo remote URL (default: "<missing>")
-r PATH, --root PATH                Relative package root dir in repo (default: "packages")
-s SCOPE, --scope SCOPE             Package scope (default: "<missing>")
```

### Command: changelog

> [!NOTE]
> See various packages in the [thi.ng/umbrella](https://github.com/thi-ng/umbrella) monorepo for generated changelogs:
> example [thi.ng/rstream changelog](https://github.com/thi-ng/umbrella/blob/develop/packages/rstream/CHANGELOG.md)

Create/update changelogs

```text
Flags:

-a, --all                           Process all packages, not just unreleased
--dry-run                           Dry run

Main:

-b NAME, --branch NAME              Remote Git branch for package links in changelog (default: "main")
-cc TYPE, --cc-types TYPE           [multiple] Only consider given Conventional Commit types for determining changes:
                                    "feat", "fix", "perf", "refactor", "build", "docs", "chore" (default:
                                    ["feat","fix","refactor","perf"])
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

-cc TYPE, --cc-types TYPE           [multiple] Only consider given Conventional Commit types for determining changes:
                                    "feat", "fix", "perf", "refactor", "build", "docs", "chore" (default:
                                    ["feat","fix","refactor","perf"])
-cb NAME, --changelog-branch NAME   Remote Git branch for package links in changelog (default: "main")
--dump-spec PATH                    Write release spec to JSON file
--max-repeat INT                    Max attempts (default: 3)
-script CMD, --publish-script CMD   Publish script alias name (default: "pub")
-rb NAME, --release-branch NAME     Remote branch name for publishing releases (default: "main")
-t INT, --throttle INT              Delay time (in ms) between publishing each pkg (default: 0)
```

## License

&copy; 2021 - 2025 Karsten Schmidt // Apache Software License 2.0
