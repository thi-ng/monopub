import type { IObjectOf } from "@thi.ng/api";
import type { DGraph } from "@thi.ng/dgraph";

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

export interface CommitHistoryOpts {
    path: string;
    scope?: string;
    limitSha?: string;
    all?: boolean;
}

export interface ReleaseSpec {
    touched: Set<string>;
    graph: DGraph<string>;
    unreleased: Commit[];
    previous: Commit[][];
    versions: IObjectOf<string>;
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
