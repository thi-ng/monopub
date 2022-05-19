import type { IObjectOf } from "@thi.ng/api";
import { defDGraph } from "@thi.ng/dgraph";
import { assert } from "@thi.ng/errors";
import { readJSON, writeJSON } from "@thi.ng/file-io";
import { conj, mapcat, partitionWhen, transduce } from "@thi.ng/transducers";
import type { Logger } from "../logger.js";
import type { ReleaseSpec, ReleaseSpecOpts } from "./api.js";
import { commitsSinceLastPublish } from "./git.js";
import { pkgJsonPath, pkgShortName } from "./package.js";
import { isPublish } from "./utils.js";
import { classifyVersionBump, versionBump } from "./version.js";

export const buildReleaseSpec = async (
    opts: ReleaseSpecOpts,
    logger: Logger
) => {
    const commits = await commitsSinceLastPublish(opts);
    assert(commits.length > 0, `no commits yet, exiting...`);
    let groups = [...partitionWhen(isPublish, commits)];
    const [unreleased, previous] = isPublish(groups[0][0])
        ? [[], groups]
        : [groups[0], groups.slice(1)];
    const touchedPkgIDs = transduce(
        mapcat((x) => x.pkgs),
        conj<string>(),
        opts.all ? commits : unreleased
    );
    const allPkgIDs = transduce(
        mapcat((x) => x.pkgs),
        conj<string>(),
        commits
    );
    // touchedPkgIDs.delete("api");
    // touchedPkgIDs.delete("transducers");
    const { deps, versions } = buildPkgCache(
        opts,
        allPkgIDs,
        touchedPkgIDs,
        logger
    );
    const graph = buildPkgGraph(deps, opts.scope);
    const spec: ReleaseSpec = {
        repo: opts,
        touched: touchedPkgIDs,
        graph,
        unreleased,
        previous,
        versions,
        nextVersions: {},
    };
    if (unreleased.length || opts.all) {
        const transitivePackages = transduce(
            mapcat((id) => [id, ...graph.transitiveDependents(id)]),
            conj<string>(),
            touchedPkgIDs
        );
        for (let pkg of transitivePackages) {
            spec.nextVersions[pkg] = versionBump(
                versions[pkg],
                classifyVersionBump(pkg, unreleased)
            );
        }
    }
    if (opts.dump) {
        writeJSON(
            opts.dump,
            {
                ...spec,
                touched: [...spec.touched].sort(),
                graph: [...spec.graph],
            },
            null,
            4,
            logger
        );
    }
    return spec;
};

const buildPkgCache = (
    opts: ReleaseSpecOpts,
    allPkgIDs: Set<string>,
    touchedPkgIDs: Set<string>,
    logger: Logger
) => {
    const deps: IObjectOf<string[]> = {};
    const versions: IObjectOf<string> = {};
    for (let id of allPkgIDs) {
        try {
            const pkg = readJSON(pkgJsonPath(opts.path, opts.pkgRoot, id));
            versions[id] = pkg.version;
            deps[id] = Object.keys(pkg.dependencies || {});
        } catch (_) {
            logger.debug(`ignoring invalid/obsolete/missing package: ${id}`);
            touchedPkgIDs.delete(id);
            allPkgIDs.delete(id);
        }
    }
    return { deps, versions };
};

export const buildPkgGraph = (cache: IObjectOf<string[]>, scope: string) => {
    const graph = defDGraph<string>();
    for (let id in cache) {
        const deps = cache[id];
        if (deps.length) {
            for (let d of deps) {
                d.startsWith(scope) && graph.addDependency(id, pkgShortName(d));
            }
        } else {
            graph.addNode(id);
        }
    }
    return graph;
};
