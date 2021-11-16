import { conj, mapcat, partitionWhen, transduce } from "@thi.ng/transducers";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import type { ReleaseWorkflowOpts } from "./api.js";
import { changeLogForPackage } from "./changelog.js";
import { commitsSinceLastPublish } from "./git.js";
import { buildPkgGraph } from "./graph.js";
import { isPublish } from "./utils.js";
import { classifyNextVersion, getNextVersion } from "./version.js";

config();

(async () => {
    const t0 = Date.now();
    const opts: ReleaseWorkflowOpts = {
        repoPath: process.env.THING_MONOPUB_REPO_PATH!,
        repoUrl: process.env.THING_MONOPUB_REPO_URL!,
        scope: process.env.THING_MONOPUB_SCOPE!,
        limitSha: "<never>",
    };
    const commits = await commitsSinceLastPublish(opts);
    const touchedPackages = transduce(
        mapcat((x) => x.pkgs),
        conj<string>(),
        commits
    );
    const groups = [...partitionWhen(isPublish, commits)];
    const graph = buildPkgGraph(opts.repoPath, touchedPackages);
    graph;
    // console.log(commits.length);
    // console.log(touchedPackages);
    // console.log([...graph]);
    const dest = process.env.THING_MONOPUB_EXPORT_PATH || "tmp";
    // writeFileSync(`${dest}/gitlog.json`, JSON.stringify(groups, null, 4));
    for (let pkg of touchedPackages) {
        const nextVersion = getNextVersion(
            opts.repoPath,
            pkg,
            classifyNextVersion(pkg, groups[0])
        );
        // console.log(pkg, nextVersion);
        const changelog = changeLogForPackage(
            opts,
            pkg,
            nextVersion,
            groups,
            false
        );
        if (changelog) {
            writeFileSync(`${dest}/changelog-${pkg}.md`, changelog);
        } else {
            // console.log("skipping changelog:", pkg);
        }
    }
    console.log((Date.now() - t0) / 1000);
})();
