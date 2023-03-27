import { string, type Args } from "@thi.ng/args";
import { compareByKey } from "@thi.ng/compare";
import { FMT_ISO_SHORT, dateTime } from "@thi.ng/date";
import { writeText } from "@thi.ng/file-io";
import { comp, filter, groupByObj, transduce } from "@thi.ng/transducers";
import { resolve } from "path";
import {
	DEFAULT_CHANGELOG_BRANCH,
	type AllPkgOpts,
	type CCTypeOpts,
	type CLIOpts,
	type CommandSpec,
	type DryRunOpts,
	type DumpSpecOpts,
	type OutDirOpts,
} from "../api.js";
import type { Logger } from "../logger.js";
import {
	CHANGELOG_TYPE_LABELS,
	CHANGELOG_TYPE_ORDER,
	type Commit,
	type ConventionalCommitType,
	type ReleaseSpec,
} from "../model/api.js";
import { isBreakingChangeMsg } from "../model/utils.js";
import { classifyVersion } from "../model/version.js";
import {
	ARG_ALL,
	ARG_CC_TYPES,
	ARG_DRY,
	ARG_DUMP_SPEC,
	ARG_OUT_DIR,
} from "./args.js";
import { buildReleaseSpecFromCtx } from "./common.js";

export interface ChangelogOpts
	extends CLIOpts,
		AllPkgOpts,
		CCTypeOpts,
		DumpSpecOpts,
		DryRunOpts,
		OutDirOpts {
	branch: string;
}

export const CHANGELOG: CommandSpec<ChangelogOpts> = {
	fn: async (ctx) => {
		generateChangeLogs(
			ctx.opts,
			await buildReleaseSpecFromCtx(ctx),
			ctx.logger
		);
	},
	opts: <Args<ChangelogOpts>>{
		...ARG_ALL,
		...ARG_CC_TYPES,
		...ARG_DRY,
		...ARG_DUMP_SPEC,
		...ARG_OUT_DIR,

		branch: string({
			alias: "b",
			hint: "NAME",
			default: DEFAULT_CHANGELOG_BRANCH,
			desc: "Remote Git branch for package links in changelog",
		}),
	},
	usage: "Create/update changelogs",
};

export const generateChangeLogs = (
	opts: ChangelogOpts,
	spec: Readonly<ReleaseSpec>,
	logger: Logger
) => {
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
const changeLogForPackage = (
	opts: ChangelogOpts,
	id: string,
	nextVersion: string,
	releases: Commit[][],
	newOnly = true
) => {
	const allowedTypes = opts.ccTypes || CHANGELOG_TYPE_ORDER;
	const changelog: any[] = [
		"# Change Log",
		"",
		`- **Last updated**: ${FMT_ISO_SHORT(Date.now(), true)}`,
		`- **Generator**: [thi.ng/monopub](https://thi.ng/monopub)`,
		"",
		"All notable changes to this project will be documented in this file.",
		"See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.",
		"",
		"**Note:** Unlisted _patch_ versions only involve non-code or otherwise excluded changes",
		"and/or version bumps of transitive dependencies.",
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
			date = FMT_ISO_SHORT(dateTime(r[0].date), true);
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
			commits.slice().sort(compareByKey("date"))
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
			)}) (${date.substring(0, 10)})\n`
		);
		for (let type of CHANGELOG_TYPE_ORDER) {
			const group = entryGroups[type];
			if (!group) continue;
			changelog.push(`#### ${CHANGELOG_TYPE_LABELS[type]}\n`);
			for (let e of group) {
				const sha = e.sha.substring(0, 7);
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
 * @param opts
 * @param line
 */
const formatGFM = (opts: ChangelogOpts, line: string) => {
	line = line
		.replace(/#(\d+)/g, (_, id) => issueLink(opts, id))
		.replace(/ ([a-f0-9]{7,})/g, (_, sha) => ` ${commitLink(opts, sha)}`);
	return opts.scope
		? line.replace(
				new RegExp(
					`@?${opts.scope
						.substring(1)
						.replace(".", "\\.")}/([a-z0-9_-]+)`,
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
