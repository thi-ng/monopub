import { Args, flag, oneOfMulti, string } from "@thi.ng/args";
import { FMT_ISO_SHORT } from "@thi.ng/date";
import { comp, filter, groupByObj, transduce } from "@thi.ng/transducers";
import { resolve } from "path";
import type { CLIOpts, CommandSpec, DryRunOpts, DumpSpecOpts } from "../api.js";
import { writeText } from "../io.js";
import {
    CHANGELOG_TYPE_LABELS,
    CHANGELOG_TYPE_ORDER,
    Commit,
    ConventionalCommitType,
} from "../model/api.js";
import { buildReleaseSpec } from "../model/release.js";
import { isBreakingChangeMsg } from "../model/utils.js";
import { classifyVersion } from "../model/version.js";
import { ARG_DRY, ARG_DUMP_SPEC } from "./args.js";

export interface ChangelogOpts extends CLIOpts, DumpSpecOpts, DryRunOpts {
    all: boolean;
    outDir?: string;
    ccTypes: string[];
    branch: string;
}

export const CHANGELOG: CommandSpec<ChangelogOpts> = {
    fn: async ({ logger, opts }) => {
        const spec = await buildReleaseSpec(
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
        const dest = resolve(opts.outDir || opts.repoPath);

        for (let pkg of spec.touched) {
            logger.debug(pkg, spec.nextVersions[pkg]);
            const changelog = changeLogForPackage(
                opts,
                pkg,
                spec.nextVersions[pkg],
                [spec.unreleased, ...spec.previous],
                false
            );
            if (changelog) {
                writeText(
                    `${dest}/packages/${pkg}/CHANGELOG.md`,
                    changelog,
                    logger,
                    opts.dryRun
                );
            } else {
                logger.info("skipping changelog:", pkg);
            }
        }
    },
    opts: <Args<ChangelogOpts>>{
        ...ARG_DRY,
        ...ARG_DUMP_SPEC,
        all: flag({
            alias: "a",
            desc: "Process all packages, not just unreleased",
        }),
        branch: string({
            alias: "b",
            hint: "NAME",
            default: "develop",
            desc: "Remote Git branch for package links in changelog",
        }),
        outDir: string({
            alias: "o",
            hint: "PATH",
            desc: "Output root dir for changelogs (default: --repo-path)",
        }),
        ccTypes: oneOfMulti(CHANGELOG_TYPE_ORDER.slice(1), {
            alias: "cc",
            hint: "TYPE",
            delim: ",",
            default: ["feat", "fix", "refactor", "perf"],
            desc: "Only consider given Conventional Commit types for determining changes",
        }),
    },
    usage: "Create/update changelogs",
};

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
    const allowedTypes = opts.ccTypes || CHANGELOG_TYPE_ORDER;
    const changelog: any[] = [
        "# Change log",
        "",
        `Last updated: ${FMT_ISO_SHORT(Date.now(), true)}`,
        "",
        "All notable changes to this project will be documented in this file.",
        "See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.",
        "",
        "**Note:** Unlisted _patch_ versions only involve version bumps of transitive dependencies",
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
                filter(
                    (x) =>
                        x.breaking ||
                        allowedTypes.includes(<ConventionalCommitType>x.type)
                )
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
            `${versionHeader(version)} [${version}](${taggedPackageUrl(
                opts,
                id,
                version
            )}) (${date.substr(0, 10)})\n`
        );
        for (let type of CHANGELOG_TYPE_ORDER) {
            const group = entryGroups[type];
            if (!group) continue;
            changelog.push(`#### ${CHANGELOG_TYPE_LABELS[type]}\n`);
            for (let e of group) {
                const sha = e.sha.substr(0, 7);
                changelog.push(
                    `- ${formatGFM(opts, e.title)} (${commitLink(opts, sha)})`
                );
                e.msg.length && changelog.push(formatLogMsg(opts, e.msg));
            }
            changelog.push("");
        }
    }
    return hasNewChanges || !newOnly ? changelog.join("\n") : undefined;
};

/**
 * Applies some Github Flavored Markdown formatting to given line. Currently,
 * only the following are processed/replaced with links:
 *
 * - issue IDs
 * - commit SHA1s
 * - scoped package names
 *
 * @param repoUrl
 * @param line
 */
const formatGFM = (opts: ChangelogOpts, line: string) => {
    line = line
        .replace(/#(\d+)/g, (_, id) => issueLink(opts, id))
        .replace(/ ([a-f0-9]{7,})/g, (_, sha) => ` ${commitLink(opts, sha)}`);
    return opts.scope
        ? line.replace(
              new RegExp(
                  `@?${opts.scope.substr(1).replace(".", "\\.")}/([a-z0-9_-]+)`,
                  "g"
              ),
              (_, id) => pkgLink(opts, id)
          )
        : line;
};

const formatLogMsg = (opts: ChangelogOpts, msg: string[]) =>
    msg
        .map(
            (x) =>
                `${isBreakingChangeMsg(x) ? "- " : "  "}${formatGFM(opts, x)}`
        )
        .join("\n");

const versionHeader = (version: string) =>
    ({ major: "#", minor: "##", patch: "###" }[classifyVersion(version)]);

const taggedPackageUrl = (opts: ChangelogOpts, pkg: string, version: string) =>
    `${opts.repoUrl}/tree/${
        opts.scope ? opts.scope + "/" : ""
    }${pkg}@${version}`;

const commitUrl = (opts: ChangelogOpts, sha: string) =>
    `${opts.repoUrl}/commit/${sha}`;

const issueLink = (opts: ChangelogOpts, id: string) =>
    `[#${id}](${opts.repoUrl}/issues/${id})`;

const commitLink = (opts: ChangelogOpts, sha: string) =>
    `[${sha}](${commitUrl(opts, sha)})`;

const pkgLink = (opts: ChangelogOpts, pkg: string) =>
    `[${opts.scope}/${pkg}](${opts.repoUrl}/tree/${opts.branch}/${opts.root}/${pkg})`;
