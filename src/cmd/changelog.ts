import { Args, string } from "@thi.ng/args";
import { FMT_ISO_SHORT } from "@thi.ng/date";
import {
    comp,
    conj,
    filter,
    groupByObj,
    mapcat,
    partitionWhen,
    transduce,
} from "@thi.ng/transducers";
import {
    CHANGELOG_TYPES,
    CHANGELOG_TYPE_LABELS,
    CLIOpts,
    CommandSpec,
    Commit,
    DryRunOpts,
} from "../api.js";
import { commitsSinceLastPublish } from "../git.js";
import { buildPkgGraph } from "../graph.js";
import { writeText } from "../io.js";
import { isBreakingChangeMsg, isPublish } from "../utils.js";
import {
    classifyNextVersion,
    classifyVersion,
    getNextVersion,
} from "../version.js";
import { ARG_DRY } from "./args.js";

export interface ChangelogOpts extends CLIOpts, DryRunOpts {
    outDir: string;
}

export const CHANGELOG: CommandSpec<ChangelogOpts> = {
    fn: async ({ logger, opts }) => {
        logger.info("changelog");
        console.log(opts);

        const t0 = Date.now();
        const commits = await commitsSinceLastPublish(opts);
        const touchedPackages = transduce(
            mapcat((x) => x.pkgs),
            conj<string>(),
            commits
        );
        const groups = [...partitionWhen(isPublish, commits)];
        const graph = buildPkgGraph(opts.repoPath, touchedPackages);
        graph;
        console.log(commits.length);
        console.log(touchedPackages);
        console.log([...graph]);
        const dest = process.env.THING_MONOPUB_EXPORT_PATH || "tmp";
        writeText(
            `${dest}/gitlog.json`,
            JSON.stringify(groups, null, 4),
            logger,
            opts.dryRun
        );
        for (let pkg of touchedPackages) {
            const nextVersion = getNextVersion(
                opts.repoPath,
                pkg,
                classifyNextVersion(pkg, groups[0])
            );
            console.log(pkg, nextVersion);
            const changelog = changeLogForPackage(
                opts,
                pkg,
                nextVersion,
                groups,
                false
            );
            if (changelog) {
                writeText(
                    `${dest}/changelog-${pkg}.md`,
                    changelog,
                    logger,
                    opts.dryRun
                );
            } else {
                console.log("skipping changelog:", pkg);
            }
        }
        console.log((Date.now() - t0) / 1000);
    },
    opts: <Args<ChangelogOpts>>{
        ...ARG_DRY,
        outDir: string({
            alias: "o",
            hint: "PATH",
            desc: "Output directory for changelogs",
        }),
    },
    usage: "Create changelog",
};

/**
 * Applies some Github Flavored Markdown formatting to given line. Currently,
 * only issue IDs and SHA1s are turned into links.
 *
 * @param repoUrl
 * @param line
 */
const formatGFM = (repoUrl: string, line: string) =>
    line
        .replace(/#(\d+)/g, (_, id) => `[#${id}](${repoUrl}/issues/${id})`)
        .replace(
            / ([a-f0-9]{7,})/g,
            (_, id) => ` [${id}](${repoUrl}/commit/${id})`
        );

/**
 * Processes commit groups and constructs a changelog (in Markdown format) for
 * given (short) package ID. The `nextVersion` can be obtained via
 * {@link getNextVersion}. Unless `newOnly` is false, the function returns
 * `undefined` if the first chunk of commits (i.e. the supposedly unreleased
 * commit group) does NOT touch the given package ID.
 *
 * @param opts
 * @param id
 * @param nextVersion
 * @param releases
 * @param newOnly
 */
export const changeLogForPackage = (
    opts: ChangelogOpts,
    id: string,
    nextVersion: string,
    releases: Commit[][],
    newOnly = true
) => {
    const changelog: any[] = [
        "# Change log",
        "",
        `Last updated: ${FMT_ISO_SHORT(Date.now(), true)}`,
        "",
        "All notable changes to this project will be documented in this file.",
        "See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.",
        "",
    ];
    let first = true;
    let hasNewChanges = false;
    for (let r of releases) {
        let version: string;
        let commits: Commit[];
        let date: string;
        if (first) {
            version = nextVersion;
            date = FMT_ISO_SHORT(Date.now(), true);
            commits = r;
        } else {
            version = r[0].tags[id];
            date = r[0].date;
            commits = r.slice(1);
        }
        if (!version) {
            first = false;
            continue;
        }
        const entryGroups = transduce(
            comp(
                filter((x) => x.pkgs.includes(id)),
                filter((x) => x.breaking || CHANGELOG_TYPES.includes(x.type))
            ),
            groupByObj<Commit, Commit[]>({
                key: (x) => (x.breaking ? "break" : x.type),
            }),
            commits
        );
        if (!Object.keys(entryGroups).length) {
            first = false;
            continue;
        }
        if (first) {
            hasNewChanges = true;
            first = false;
        }
        changelog.push(
            `${
                { major: "#", minor: "##", patch: "###" }[
                    classifyVersion(version)
                ]
            } [${version}](${
                opts.repoUrl
            }/tree/@thi.ng/${id}@${version}) (${date.substr(0, 10)})\n`
        );
        for (let type of CHANGELOG_TYPES) {
            const group = entryGroups[type];
            if (!group) continue;
            changelog.push(`#### ${CHANGELOG_TYPE_LABELS[type]}\n`);
            for (let e of group) {
                const sha = e.sha.substr(0, 7);
                changelog.push(
                    `- ${formatGFM(opts.repoUrl, e.title)} ([${sha}](${
                        opts.repoUrl
                    }/commit/${sha}))`
                );
                e.msg.length &&
                    changelog.push(
                        ...e.msg.map(
                            (x) =>
                                `${
                                    isBreakingChangeMsg(x) ? "- " : "  "
                                }${formatGFM(opts.repoUrl, x)}`
                        )
                    );
            }
            changelog.push("");
        }
    }
    return hasNewChanges || !newOnly ? changelog.join("\n") : undefined;
};
