import { coerceInt, int, string } from "@thi.ng/args";
import { delayed } from "@thi.ng/compose";
import { illegalArgs } from "@thi.ng/errors";
import { readJSON, writeJSON } from "@thi.ng/file-io";
import { execFileSync } from "node:child_process";
import {
	DEFAULT_CHANGELOG_BRANCH,
	DEFAULT_RELEASE_BRANCH,
	type AllPkgOpts,
	type CCTypeOpts,
	type CLIOpts,
	type CommandCtx,
	type CommandSpec,
	type DryRunOpts,
	type DumpSpecOpts,
	type MaxRepeatOpts,
} from "../api.js";
import type { Logger } from "../logger.js";
import type { ReleaseSpec } from "../model/api.js";
import { pkgJsonPath, pkgPath } from "../model/package.js";
import {
	ARG_ALL,
	ARG_CC_TYPES,
	ARG_DRY,
	ARG_DUMP_SPEC,
	ARG_REPEAT,
	ARG_SINCE,
} from "./args.js";
import { generateChangeLogs } from "./changelog.js";
import { buildReleaseSpecFromCtx } from "./common.js";
import { applyVersionBumps } from "./version.js";

export interface ReleaseOpts
	extends CLIOpts,
		AllPkgOpts,
		CCTypeOpts,
		DryRunOpts,
		DumpSpecOpts,
		MaxRepeatOpts {
	changelogBranch: string;
	since: string;
	releaseBranch: string;
	publishScript: string;
	throttle: number;
}

export const RELEASE: CommandSpec<ReleaseOpts> = {
	fn: async (ctx) => {
		const { opts, logger } = ctx;
		// FIXME debug only
		// opts.dryRun = true;
		ensureReleaseBranch(ctx);
		ensureRepoIsClean(ctx);
		const spec = await buildReleaseSpecFromCtx(ctx);
		generateChangeLogs(
			{
				...opts,
				branch: opts.changelogBranch,
				since: opts.since,
				ccTypes: opts.ccTypes,
			},
			spec,
			logger
		);
		logSep(logger);
		applyVersionBumps(opts, spec, logger);
		updateYarnLock(ctx);
		logSep(logger);
		gitCommit(ctx, spec);
		logSep(logger);
		gitAddReleaseTags(ctx, spec);
		logSep(logger);
		gitPushRelease(ctx);
		logSep(logger);
		injectGitHead(ctx, spec);
		logSep(logger);
		await publishPackages(ctx, spec);
		logSep(logger);
		gitReset(ctx);
		logger.info(
			"Successfully published",
			Object.keys(spec.nextVersions).length,
			"packages"
		);
	},
	opts: {
		...ARG_ALL,
		...ARG_CC_TYPES,
		...ARG_DRY,
		...ARG_DUMP_SPEC,
		...ARG_REPEAT,
		...ARG_SINCE,

		changelogBranch: string({
			alias: "cb",
			hint: "NAME",
			default: DEFAULT_CHANGELOG_BRANCH,
			desc: "Remote Git branch for package links in changelog",
		}),
		releaseBranch: string({
			alias: "rb",
			hint: "NAME",
			default: DEFAULT_RELEASE_BRANCH,
			desc: "Remote branch name for publishing releases",
		}),
		publishScript: string({
			alias: "script",
			hint: "CMD",
			default: "pub",
			desc: "Publish script alias name",
		}),
		throttle: int({
			alias: "t",
			default: 0,
			desc: "Delay time (in ms) between publishing each pkg",
			fn: (x: string) => {
				const val = coerceInt(x);
				return val >= 0 || illegalArgs("value must be >= 0");
			},
		}),
	},
	usage: "Prepare and execute full release of all touched packages",
};

const logSep = (logger: Logger) =>
	logger.info("--------------------------------");

const execInRepo = (
	ctx: CommandCtx<ReleaseOpts>,
	cmd: string,
	...args: string[]
) => {
	ctx.logger.debug(cmd, ...args);
	return execFileSync(cmd, args, { cwd: ctx.opts.repoPath });
};

const ensureRepoIsClean = (ctx: CommandCtx<ReleaseOpts>) => {
	try {
		execInRepo(ctx, "git", "diff-index", "--quiet", "HEAD", "--");
	} catch (e) {
		throw new Error("Repo has uncommitted changes, aborting...");
	}
};

const ensureReleaseBranch = (ctx: CommandCtx<ReleaseOpts>) => {
	const branch = execInRepo(ctx, "git", "rev-parse", "--abbrev-ref", "HEAD")
		.toString()
		.trim();
	if (branch !== ctx.opts.releaseBranch) {
		throw new Error("Repo is currently not on release branch, aborting...");
	}
};

const gitCommit = (ctx: CommandCtx<ReleaseOpts>, spec: ReleaseSpec) => {
	const { opts, logger } = ctx;
	logger.dry(opts.dryRun, "Creating 'Publish' Git commit...");
	if (opts.dryRun) return;
	execInRepo(
		ctx,
		"git",
		"add",
		"-f",
		"yarn.lock",
		...Object.keys(spec.nextVersions).map(
			(x) => `${opts.root}/${x}/CHANGELOG.md`
		)
	);
	execInRepo(ctx, "git", "commit", "-a", "-m", "Publish");
};

const gitAddReleaseTags = (ctx: CommandCtx<ReleaseOpts>, spec: ReleaseSpec) => {
	const { opts, logger } = ctx;
	logger.dry(opts.dryRun, "Adding Git release tags...");
	for (let id in spec.nextVersions) {
		const tag = `${opts.scope}/${id}@${spec.nextVersions[id]}`;
		logger.dry(opts.dryRun, tag);
		!opts.dryRun && execInRepo(ctx, "git", "tag", tag);
	}
};

const gitPushRelease = (ctx: CommandCtx<ReleaseOpts>) => {
	const { opts, logger } = ctx;
	logger.dry(opts.dryRun, "Pushing release to Git remote:", opts.repoUrl);
	if (opts.dryRun) return;
	execInRepo(ctx, "git", "push", "origin", opts.releaseBranch, "--tags");
};

const gitReset = (ctx: CommandCtx<ReleaseOpts>) => {
	const { opts, logger } = ctx;
	logger.dry(opts.dryRun, "Resetting local git head...");
	if (opts.dryRun) return;
	execInRepo(ctx, "git", "reset", "--hard");
};

const injectGitHead = (ctx: CommandCtx<ReleaseOpts>, spec: ReleaseSpec) => {
	const { opts, logger } = ctx;
	const gitHead = execInRepo(ctx, "git", "rev-parse", "HEAD").toString();
	logger.dry(opts.dryRun, "injecting gitHead SHA", gitHead);
	for (let id in spec.nextVersions) {
		const path = pkgJsonPath(opts.repoPath, opts.root, id);
		const pkg = readJSON(path);
		pkg.gitHead = gitHead;
		writeJSON(path, pkg, null, opts.indent, logger, opts.dryRun);
	}
};

const publishPackages = async (
	ctx: CommandCtx<ReleaseOpts>,
	spec: ReleaseSpec
) => {
	const { opts, logger } = ctx;
	const packages = [...spec.graph].filter((id) => spec.nextVersions[id]);
	const num = packages.length;
	for (let i = 0; i < packages.length; i++) {
		const id = packages[i];
		logger.dry(
			opts.dryRun,
			`(${i + 1} / ${num}) publishing pkg: ${opts.scope}/${id}@${
				spec.nextVersions[id]
			}`
		);
		if (!opts.dryRun) {
			for (let k = 0; k < opts.maxRepeat; k++) {
				try {
					execFileSync("yarn", ["run", opts.publishScript], {
						cwd: pkgPath(opts.repoPath, opts.root, id),
					});
					if (opts.throttle > 0) await delayed(null, opts.throttle);
					break;
				} catch (e) {
					logger.warn((<Error>e).message);
					if (k < opts.maxRepeat - 1) {
						logger.info(
							"waiting for ",
							1 << k,
							"second(s) before retrying..."
						);
						await delayed(null, (1 << k) * 1000);
					} else {
						gitReset(ctx);
						throw new Error(
							"reached max. number of publish attempts, giving up..."
						);
					}
				}
			}
		}
	}
};

const updateYarnLock = (ctx: CommandCtx<ReleaseOpts>) => {
	ctx.logger.info("update yarn.lock file");
	execInRepo(ctx, "yarn", "install");
};
