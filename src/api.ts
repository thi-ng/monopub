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

export interface ReleaseWorkflowOpts {
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
