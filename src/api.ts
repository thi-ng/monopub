import type { Fn } from "@thi.ng/api";
import type { Args } from "@thi.ng/args";
import { resolve } from "path";
import type { AppConfig } from "./config.js";
import { readJSON } from "./io.js";
import type { Logger } from "./logger.js";
import { pkgShortName } from "./utils.js";

export interface CLIOpts {
    /**
     * Local monorepo path/root dir
     */
    repoPath: string;
    /**
     * Remote monorepo base URL (e.g. https://github.com/thi-ng/umbrella) - NO trailing slash!
     */
    repoUrl: string;
    /**
     * Common package scope for all packages in the monorepo, e.g. `@thi.ng`.
     */
    scope?: string;
    /**
     * Only process commits newer than given SHA1.
     */
    limitSha?: string;
}

export interface DryRunOpts {
    dryRun: boolean;
}

export interface CommandSpec<T extends CLIOpts> {
    /**
     * Actual command implementation
     */
    fn: Fn<CommandCtx<T>, Promise<void>>;
    /**
     * Command specific CLI arg specs
     */
    opts: Args<T>;
    /**
     * Usage string for command overview.
     */
    usage: string;
}

export interface CommandCtx<T extends CLIOpts> {
    cmd: CommandSpec<T>;
    config: AppConfig;
    logger: Logger;
    opts: T;
    rest: string[];
}

export interface Commit {
    /**
     * SHA1 hash
     */
    sha: string;
    /**
     * Object of unscoped package names (as keys) and their versions (as
     * values).
     */
    tags: Record<string, string>;
    /**
     * First line of commit message
     */
    title: string;
    /**
     * Commit date as ISO string
     */
    date: string;
    /**
     * Commit author
     */
    author: string;
    /**
     * Remaining commit message lines (excluding empty lines)
     */
    msg: string[];
    /**
     * Files touched by this commit
     */
    files: string[];
    /**
     * (Short) package names touched by this commit (computed from `files`).
     */
    pkgs: string[];
    /**
     * Conventional commit type (e.g. feat/fix/refactor/perf/build/chore etc.)
     */
    type: string;
    /**
     * True, if commit is a breaking change (i.e. if commit message includes a
     * line starting with: `BREAKING CHANGE:`)
     */
    breaking: boolean;
}

export type VersionType = "major" | "minor" | "patch";

export const TAG_PREFIX = "refs/tags/";

export const CHANGELOG_TYPES = ["break", "feat", "fix", "refactor", "perf"];

export const CHANGELOG_TYPE_LABELS: Record<string, string> = {
    break: "Breaking changes",
    feat: "Features",
    fix: "Bug fixes",
    refactor: "Refactoring",
    perf: "Performance",
};

export const INSTALL_DIR = resolve(`${process.argv[2]}/..`);

export const PKG = readJSON(`${INSTALL_DIR}/package.json`);

export const APP_NAME = pkgShortName(PKG.name);

export const HEADER = `
 █ █   █           │
██ █               │
 █ █ █ █   █ █ █ █ │ ${PKG.name} ${PKG.version}
 █ █ █ █ █ █ █ █ █ │ ${PKG.description}
                 █ │
               █ █ │
`;
