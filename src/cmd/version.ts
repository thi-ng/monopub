import type { IObjectOf } from "@thi.ng/api";
import type { Args } from "@thi.ng/args";
import { assert } from "@thi.ng/errors";
import { readJSON, writeJSON } from "@thi.ng/file-io";
import { resolve } from "path";
import type {
	AllPkgOpts,
	CLIOpts,
	CommandSpec,
	DryRunOpts,
	DumpSpecOpts,
	OutDirOpts,
} from "../api";
import type { Logger } from "../logger.js";
import type { ReleaseSpec } from "../model/api.js";
import { pkgJsonPath, pkgShortName } from "../model/package.js";
import { ARG_ALL, ARG_DRY, ARG_DUMP_SPEC, ARG_OUT_DIR } from "./args.js";
import { buildReleaseSpecFromCtx } from "./common.js";

export interface VersionOpts
	extends CLIOpts,
		AllPkgOpts,
		DumpSpecOpts,
		DryRunOpts,
		OutDirOpts {}

export const VERSION: CommandSpec<VersionOpts> = {
	fn: async (ctx) => {
		applyVersionBumps(
			ctx.opts,
			await buildReleaseSpecFromCtx(ctx),
			ctx.logger
		);
	},
	opts: <Args<VersionOpts>>{
		...ARG_ALL,
		...ARG_DRY,
		...ARG_DUMP_SPEC,
		...ARG_OUT_DIR,
	},
	usage: "Compute & apply version bumps",
};

export const applyVersionBumps = (
	opts: VersionOpts,
	spec: Readonly<ReleaseSpec>,
	logger: Logger
) => {
	const dest = resolve(opts.outDir || opts.repoPath);
	for (let id in spec.nextVersions) {
		const nextVersion = spec.nextVersions[id];
		assert(!!nextVersion, `missing version info for pkg: ${id}`);
		const pkg = readJSON(pkgJsonPath(opts.repoPath, opts.root, id));
		assert(
			pkg.version === spec.versions[id],
			`current version mismatch for pkg: ${id}`
		);
		pkg.version = nextVersion;
		logger.info(`version bump:`, id, spec.versions[id], "->", nextVersion);
		pkg.dependencies &&
			updateDeps(opts.scope, pkg.dependencies, spec, logger);
		pkg.devDependencies &&
			updateDeps(opts.scope, pkg.devDependencies, spec, logger);
		writeJSON(
			pkgJsonPath(dest, opts.root, id),
			pkg,
			null,
			opts.indent,
			logger,
			opts.dryRun
		);
	}
};

const RE_SEMVER = /^\^?\d+\.\d+\.\d+/;

const updateDeps = (
	scope: string,
	deps: IObjectOf<string>,
	spec: ReleaseSpec,
	logger: Logger
) => {
	for (let id in deps) {
		if (
			!id.startsWith(scope) ||
			// only process semver deps
			!RE_SEMVER.test(deps[id])
		) {
			logger.debug(`skipping dep: ${id}: ${deps[id]}`);
			continue;
		}
		const name = pkgShortName(id);
		deps[id] = `^${spec.nextVersions[name] || spec.versions[name]}`;
	}
};
