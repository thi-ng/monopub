import type { Pair } from "@thi.ng/api";
import { illegalState } from "@thi.ng/errors";
import { transduce as $transduce } from "@thi.ng/rstream";
import {
    assocObj,
    comp,
    filter,
    push,
    Reducer,
    takeWhile,
    Transducer,
} from "@thi.ng/transducers";
import { spawn } from "child_process";
import { linesFromNodeJS } from "../utils.js";
import { Commit, CommitHistoryOpts, TAG_PREFIX } from "./api.js";
import { isBreakingChangeMsg } from "./utils.js";

const parseTags = (src: string, scope?: string) => {
    const re = /tag: ([@a-z0-9/.-]+)/g;
    const tags: Pair<string, string>[] = [];
    const prefix = scope ? `${TAG_PREFIX}${scope}/` : TAG_PREFIX;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src))) {
        tags.push(
            <Pair<string, string>>match[1].substr(prefix.length).split("@")
        );
    }
    return assocObj(tags);
};

/**
 * Transducer consuming lines from `git log` and parsing/grouping them into
 * {@link Commit} objects. Used by {@link commitsSinceLastPublish}.
 *
 * @param scope
 */
export const parseCommit =
    (scope?: string): Transducer<string, Commit> =>
    ([init, complete, reduce]: Reducer<any, Commit>) => {
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
                let match = /^commit ([a-f0-9]{40})(.*)/i.exec(line);
                if (match) {
                    if (commit) {
                        acc = reduce(acc, commit);
                    }
                    commit = <Commit>{
                        sha: match[1],
                        tags: parseTags(match[2], scope),
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
                    match = /^(author|date):\s+(.*)/i.exec(line);
                    if (match) {
                        if (match[1].toLowerCase() === "author")
                            commit.author = match[2];
                        if (match[1].toLowerCase() === "date")
                            commit.date = match[2];
                    } else {
                        match = /^([adm]|[cr]\d+)\s+(.*)/i.exec(line);
                        if (match) {
                            commit.files.push(match[2]);
                            match =
                                /^packages\/([a-z0-9-]+)\/.*\.(ts|js|json)$/.exec(
                                    match[2]
                                );
                            if (match && !commit.pkgs.includes(match[1])) {
                                commit.pkgs.push(match[1]);
                            }
                        } else {
                            line = line.substr(4);
                            if (line.length) {
                                if (!commit.title) {
                                    match =
                                        /^([a-z]+)(\([a-z0-9-]+\))?:\s+(.+)/i.exec(
                                            line
                                        );
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
    const sha = opts.limitSha || "<all>";
    return await $transduce(
        linesFromNodeJS(cmd.stdout, cmd.stderr),
        comp(
            parseCommit(opts.scope),
            takeWhile((x) => !x.sha.startsWith(sha)),
            filter((x) => x.pkgs.length > 0)
        ),
        push<Commit>()
    );
};
