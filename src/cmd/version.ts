import type { Args } from "@thi.ng/args";
import { assert } from "@thi.ng/errors";
import { resolve } from "path";
import type {
    AllPkgOpts,
    CLIOpts,
    CommandSpec,
    DryRunOpts,
    DumpSpecOpts,
    OutDirOpts,
} from "../api";
import { readJSON, writeJSON } from "../io.js";
import type { Logger } from "../logger.js";
import type { ReleaseSpec } from "../model/api.js";
import { pkgJsonPath, pkgShortName } from "../utils.js";
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
    const reSemVer = /^\^?\d+\.\d+\.\d+/;
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
        const deps = pkg.dependencies;
        if (deps) {
            for (let id in deps) {
                if (
                    !id.startsWith(opts.scope) ||
                    // only process semver deps
                    !reSemVer.test(deps[id])
                ) {
                    logger.debug(`skipping dep: ${id}: ${deps[id]}`);
                    continue;
                }
                const name = pkgShortName(id);
                deps[id] = `^${spec.nextVersions[name] || spec.versions[name]}`;
            }
        }
        writeJSON(pkgJsonPath(dest, opts.root, id), pkg, logger, opts.dryRun);
    }
};
