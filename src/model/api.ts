import type { IObjectOf } from "@thi.ng/api";
import type { KVDict } from "@thi.ng/args";
import type { DGraph } from "@thi.ng/dgraph";

export interface RepoConfig {
    /**
     * Absolute local monorepo path/root dir
     */
    path: string;
    /**
     * Remote monorepo base URL (e.g. https://github.com/thi-ng/umbrella) - NO trailing slash!
     */
    url: string;
    /**
     * Relative package root dir in repo (NO trailing slash!).
     *
     * @defaultValue "packages"
     */
    pkgRoot: string;
    /**
     * Common package scope for all packages in the monorepo, e.g. `@thi.ng`.
     */
    scope: string;
    /**
     * Only consider given file types/extensions for determining changes
     */
    fileExt: string[];
    /**
     * Package names aliases (keys = old name, vals = new name)
     */
    alias: KVDict;
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
    tags: IObjectOf<string>;
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

export interface CommitHistoryOpts extends RepoConfig {
    all: boolean;
}

export interface ReleaseSpecOpts extends CommitHistoryOpts {
    dump?: string;
}

export interface ReleaseSpec {
    repo: RepoConfig;
    touched: Set<string>;
    graph: DGraph<string>;
    unreleased: Commit[];
    previous: Commit[][];
    versions: IObjectOf<string>;
    nextVersions: IObjectOf<string>;
}

export type VersionType = "major" | "minor" | "patch";

export const CHANGELOG_TYPE_ORDER: ConventionalCommitType[] = [
    "break",
    "feat",
    "fix",
    "perf",
    "refactor",
    "build",
    "docs",
    "chore",
];

export type ConventionalCommitType = keyof typeof CHANGELOG_TYPE_LABELS;

export const CHANGELOG_TYPE_LABELS = {
    break: "🛑 Breaking changes",
    build: "🛠 Build related",
    chore: "🧹 Chores",
    docs: "📖 Documentation",
    feat: "🚀 Features",
    fix: "🩹 Bug fixes",
    refactor: "♻️ Refactoring",
    perf: "⏱ Performance improvements",
};
