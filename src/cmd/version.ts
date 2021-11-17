import { Args, flag } from "@thi.ng/args";
import { assert } from "@thi.ng/errors";
import { resolve } from "path";
import type {
    CLIOpts,
    CommandSpec,
    DryRunOpts,
    DumpSpecOpts,
    OutDirOpts,
} from "../api";
import { readJSON, writeText } from "../io.js";
import type { Logger } from "../logger.js";
import type { ReleaseSpec } from "../model/api.js";
import { pkgPath } from "../utils.js";
import { ARG_DRY, ARG_DUMP_SPEC, ARG_OUT_DIR } from "./args.js";
import { buildReleaseSpecFromCtx } from "./common.js";

export interface VersionOpts
    extends CLIOpts,
        DumpSpecOpts,
        DryRunOpts,
        OutDirOpts {
    all: boolean;
}

export const VERSION: CommandSpec<VersionOpts> = {
    fn: async (ctx) => {
        applyVersionBumps(
            ctx.opts,
            await buildReleaseSpecFromCtx(ctx),
            ctx.logger
        );
    },
    opts: <Args<VersionOpts>>{
        ...ARG_DRY,
        ...ARG_DUMP_SPEC,
        ...ARG_OUT_DIR,
        all: flag({
            alias: "a",
            desc: "Process all packages, not just unreleased",
        }),
    },
    usage: "Compute & apply version bumps",
};

export const applyVersionBumps = (
    opts: VersionOpts,
    spec: ReleaseSpec,
    logger: Logger
) => {
    const dest = resolve(opts.outDir || opts.repoPath);
    for (let id in spec.nextVersions) {
        const nextVersion = spec.nextVersions[id];
        assert(!!nextVersion, `missing version info for pkg: ${id}`);
        const pkg = readJSON(pkgPath(opts.repoPath, opts.root, id));
        assert(
            pkg.version === spec.versions[id],
            `current version mismatch for pkg: ${id}`
        );
        pkg.version = nextVersion;
        logger.info(`version bump:`, id, spec.versions[id], "->", nextVersion);
        writeText(
            pkgPath(dest, opts.root, id),
            JSON.stringify(pkg, null, 4),
            logger,
            opts.dryRun
        );
    }
};
