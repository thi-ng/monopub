# @thi.ng/monopub

Lightweight & fast monorepo publish/release/changelog manager to automate
releases using nothing more than [Conventional
Commits](https://conventionalcommits.org/).

Very early stage WIP - not much to see yet...

## Status

Currently implemented:

- [x] Detailed Git commit parsing, filtering & analysis
- [x] Computing packages touched by recent commits
- [x] Dependency graph construction for monorepo internal packages (incl. topological sort)
- [x] Computing new package versions (based on Conventional Commit types used)
- [x] Selective changelog creation (as Markdown files)
- [x] Repo/publish config via dotenv

Outstanding:

- [ ] Update package files w/ version bumps
- [ ] Commit updated package & changelog files
- [ ] Create & add release tags
_ [ ] Push to git remote
- [ ] Publish to registry
- [x] Logger
- [x] thi.ng/args CLI arg parsing
- [x] thi.ng/system setup

## Goals & Non-goals

The current aim of this project is to produce an as minimal as possible release
workflow suitable for the thi.ng/umbrella monorepo (160+ TypeScript packages).
There will be configuration options to allow this tool to be used with other
(similar) monorepo setups, however there's no desire to go down the usual route
in JS-land of adding 100s of overly complicated options suitable for seemingly
all use cases and then none...
