import type { CommandCtx } from "../api";
import { buildReleaseSpec } from "../model/release.js";

export const buildReleaseSpecFromCtx = ({ logger, opts }: CommandCtx<any>) =>
	buildReleaseSpec(
		{
			path: opts.repoPath,
			url: opts.repoUrl,
			scope: opts.scope,
			pkgRoot: opts.root,
			fileExt: opts.ext,
			alias: opts.alias,
			all: opts.all,
			dump: opts.dumpSpec,
		},
		logger
	);
