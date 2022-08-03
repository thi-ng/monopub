import { Args, string } from "@thi.ng/args";
import { readJSON, writeJSON } from "@thi.ng/file-io";
import { execFileSync } from "child_process";
import {
	AllPkgOpts,
	CCTypeOpts,
	CLIOpts,
	CommandCtx,
	CommandSpec,
	DEFAULT_CHANGELOG_BRANCH,
	DEFAULT_RELEASE_BRANCH,
	DryRunOpts,
	DumpSpecOpts,
} from "../api.js";
import type { Logger } from "../logger.js";
import type { ReleaseSpec } from "../model/api.js";
import { pkgJsonPath, pkgPath } from "../model/package.js";
import { ARG_ALL, ARG_CC_TYPES, ARG_DRY, ARG_DUMP_SPEC } from "./args.js";
import { generateChangeLogs } from "./changelog.js";
import { buildReleaseSpecFromCtx } from "./common.js";
import { applyVersionBumps } from "./version.js";

export interface ReleaseOpts
	extends CLIOpts,
		AllPkgOpts,
		CCTypeOpts,
		DryRunOpts,
		DumpSpecOpts {
	changelogBranch: string;
	releaseBranch: string;
	publishScript: string;
}

export const RELEASE: CommandSpec<ReleaseOpts> = {
	fn: async (ctx) => {
		const { opts, logger } = ctx;
		// FIXME debug only
		// opts.dryRun = true;
		// TODO optionally check we're on main/release branch
		// TODO optionally check `git status -s` and terminate if not clean
		const spec = await buildReleaseSpecFromCtx(ctx);
		generateChangeLogs(
			{
				...opts,
				branch: opts.changelogBranch,
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
		publishPackages(ctx, spec);
		logSep(logger);
		gitReset(ctx);
		logger.info(
			"Successfully published",
			Object.keys(spec.nextVersions).length,
			"packages"
		);
	},
	opts: <Args<ReleaseOpts>>{
		...ARG_ALL,
		...ARG_CC_TYPES,
		...ARG_DRY,
		...ARG_DUMP_SPEC,
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

const publishPackages = (
	{ opts, logger }: CommandCtx<ReleaseOpts>,
	spec: ReleaseSpec
) => {
	for (let id of [...spec.graph]) {
		if (!spec.nextVersions[id]) continue;
		logger.dry(opts.dryRun, `publishing pkg: ${opts.scope}/${id}`);
		!opts.dryRun &&
			execFileSync("yarn", ["run", opts.publishScript], {
				cwd: pkgPath(opts.repoPath, opts.root, id),
			});
	}
};

const updateYarnLock = (ctx: CommandCtx<ReleaseOpts>) => {
	ctx.logger.info("update yarn.lock file");
	execInRepo(ctx, "yarn", "install");
};
