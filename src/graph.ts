import { defDGraph } from "@thi.ng/dgraph";
import { readJSON } from "./io.js";
import { pkgShortName } from "./utils.js";

export const buildPkgGraph = (root: string, ids: Set<string>) => {
    const graph = defDGraph<string>();
    for (let id of ids) {
        try {
            const pkg = readJSON(`${root}/packages/${id}/package.json`);
            const deps = Object.keys(pkg.dependencies || {});
            if (deps.length) {
                for (let d of deps) {
                    d.startsWith("@thi.ng/") &&
                        graph.addDependency(id, pkgShortName(d));
                }
            } else {
                graph.addNode(id);
            }
        } catch (e) {
            ids.delete(id);
            //console.log(`skipping ${id}: ${(<Error>e).message}`);
        }
    }
    return graph;
};
