import { FMT_ISO_SHORT } from "@thi.ng/date/format";
import { comp } from "@thi.ng/transducers/comp";
import { filter } from "@thi.ng/transducers/filter";
import { groupByObj } from "@thi.ng/transducers/group-by-obj";
import { transduce } from "@thi.ng/transducers/transduce";
import {
    CHANGELOG_TYPES,
    CHANGELOG_TYPE_LABELS,
    Commit,
    ReleaseWorkflowOpts,
} from "./api.js";
import { isBreakingChangeMsg } from "./utils.js";
import { classifyVersion } from "./version.js";

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
    opts: ReleaseWorkflowOpts,
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
