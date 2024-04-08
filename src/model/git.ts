import type { IObjectOf, Pair } from "@thi.ng/api";
import type { KVDict } from "@thi.ng/args";
import { illegalState } from "@thi.ng/errors";
import { transduce as $transduce, linesFromNodeJS } from "@thi.ng/rstream";
import {
	comp,
	filter,
	push,
	type Reducer,
	type Transducer,
} from "@thi.ng/transducers";
import { spawn } from "child_process";
import type { Commit, CommitHistoryOpts, RepoConfig } from "./api.js";
import { isBreakingChangeMsg } from "./utils.js";

const parseTags = (src: string, scope: string) => {
	const re = /tag: ([@a-z0-9/.-]+)/g;
	const tags: IObjectOf<string> = {};
	const prefix = `refs/tags/${scope}/`;
	let match: RegExpExecArray | null;
	while ((match = re.exec(src))) {
		const [pkg, version] = <Pair<string, string>>(
			match[1].substring(prefix.length).split("@")
		);
		tags[pkg] = version;
	}
	return tags;
};

type ParseCommitOpts = Required<
	Pick<RepoConfig, "scope" | "pkgRoot" | "fileExt" | "alias">
>;

/**
 * Transducer consuming lines from `git log` and parsing/grouping them into
 * {@link Commit} objects. Used by {@link commitsSinceLastPublish}.
 *
 * @param opts
 */
export const parseCommit =
	(opts: ParseCommitOpts): Transducer<string, Commit> =>
	([init, complete, reduce]: Reducer<Commit, any>) => {
		const reCommitHeader = /^commit ([a-f0-9]{40})(.*)/i;
		const reCommitMeta = /^(author|date):\s+(.*)/i;
		const reConventionalCommit = /^([a-z]+)(\([a-z0-9_-]+\))?:\s+(.+)/i;
		const reFileChange = /^([adm]|[cr]\d+)\s+(.*)/i;
		const fileExt = [...new Set(["json", ...opts.fileExt])].join("|");
		const rePkgFile = new RegExp(
			`^${opts.pkgRoot}/([a-z0-9_-]+)/.+\\.(${fileExt})$`
		);
		let commit: Commit | undefined;
		return [
			init,
			(acc: any) => {
				if (commit) {
					acc = reduce(acc, commit);
					commit = undefined;
				}
				return complete(acc);
			},
			(acc: any, line: string) => {
				let match = reCommitHeader.exec(line);
				if (match) {
					if (commit) {
						acc = reduce(acc, commit);
					}
					commit = <Commit>{
						sha: match[1],
						tags: parseTags(match[2], opts.scope),
						title: "",
						msg: [],
						files: [],
						date: "",
						author: "",
						type: "",
						pkgs: [],
						breaking: false,
					};
				} else if (commit) {
					match = reCommitMeta.exec(line);
					if (match) {
						if (match[1].toLowerCase() === "author")
							commit.author = match[2];
						if (match[1].toLowerCase() === "date")
							commit.date = match[2];
					} else {
						match = reFileChange.exec(line);
						if (match) {
							const matchExt = rePkgFile.exec(match[2]);
							if (matchExt) {
								commit.files.push(match[2]);
								const pkgName = resolveAlias(
									opts.alias,
									matchExt[1]
								);
								if (!commit.pkgs.includes(pkgName)) {
									commit.pkgs.push(pkgName);
								}
							}
						} else {
							line = line.substring(4);
							if (line.length) {
								if (!commit.title) {
									match = reConventionalCommit.exec(line);
									if (match) {
										commit.type = match[1];
										commit.title = match[3];
									} else {
										commit.title = line;
									}
								} else {
									commit.msg.push(line);
									!commit.breaking &&
										(commit.breaking =
											isBreakingChangeMsg(line));
								}
							}
						}
					}
				} else {
					illegalState(`unexpected line ${line}`);
				}
				return acc;
			},
		];
	};

const resolveAlias = (aliases: KVDict, id: string) => aliases[id] || id;

export const commitsSinceLastPublish = async (opts: CommitHistoryOpts) => {
	const cmd = spawn(
		"git",
		[
			"log",
			"--no-color",
			"--name-status",
			"--decorate=full",
			"--date=iso-strict",
		],
		{ cwd: opts.path }
	);
	return await $transduce(
		linesFromNodeJS(cmd.stdout, cmd.stderr),
		comp(
			parseCommit(opts),
			filter((x) => x.pkgs.length > 0)
		),
		push<Commit>()
	);
};
