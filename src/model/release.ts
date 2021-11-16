import type { ILogger } from "@thi.ng/logger";
import { conj, mapcat, partitionWhen, transduce } from "@thi.ng/transducers";
import { packageExists } from "../utils.js";
import type { CommitHistoryOpts, ReleaseSpec } from "./api.js";
import { commitsSinceLastPublish } from "./git.js";
import { buildPkgGraph } from "./graph.js";
import { isPublish } from "./utils.js";
import { classifyNextVersion, getNextVersion } from "./version.js";

export const buildReleaseSpec = async (
    opts: CommitHistoryOpts,
    logger: ILogger
) => {
    const commits = await commitsSinceLastPublish(opts);
    let groups = [...partitionWhen(isPublish, commits)];
    const [unreleased, previous] = isPublish(groups[0][0])
        ? [[], groups]
        : [groups[0], groups.slice(1)];
    const touchedPackages = transduce(
        mapcat((x) => x.pkgs),
        conj<string>(),
        opts.all ? commits : unreleased
    );
    // touchedPackages.delete("api");
    // touchedPackages.delete("transducers");
    const allPackages = transduce(
        mapcat((x) => x.pkgs),
        conj<string>(),
        commits
    );
    const graph = buildPkgGraph(opts.path, allPackages);
    const spec: ReleaseSpec = {
        touched: touchedPackages,
        graph,
        unreleased,
        previous,
        versions: {},
    };
    if (unreleased.length) {
        const transitivePackages = transduce(
            mapcat((id) => [id, ...graph.transitiveDependents(id)]),
            conj<string>(),
            touchedPackages
        );
        for (let pkg of transitivePackages) {
            if (!packageExists(opts.path, pkg)) {
                logger.debug("ignoring obsolete package:", pkg);
                continue;
            }
            spec.versions[pkg] = getNextVersion(
                opts.path,
                pkg,
                classifyNextVersion(pkg, unreleased)
            );
        }
    }
    return spec;
};
