import { DEFAULT_RELEASE_BRANCH, type CommandCtx } from "../api.js";
import { buildReleaseSpec } from "../model/release.js";

export const buildReleaseSpecFromCtx = ({ logger, opts }: CommandCtx<any>) =>
	buildReleaseSpec(
		{
			path: opts.repoPath,
			url: opts.repoUrl,
			type: opts.repoType ?? "github",
			branch: opts.branch ?? DEFAULT_RELEASE_BRANCH,
			scope: opts.scope,
			pkgRoot: opts.root,
			fileExt: opts.ext,
			alias: opts.alias,
			all: opts.all,
			dump: opts.dumpSpec,
			indent: opts.indent,
		},
		logger,
	);
