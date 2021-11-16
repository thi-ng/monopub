import { Stream, stream, Subscription } from "@thi.ng/rstream";
import { isReduced, Reducer, Transducer } from "@thi.ng/transducers";
import type { Readable } from "stream";
import type { Commit } from "./api.js";

export const isPublish = (x: Commit) => x.title.toLowerCase() === "publish";

export const isBreakingChangeMsg = (x: string) =>
    x.startsWith("BREAKING CHANGE:");

export const pkgShortName = (name: string) => name.split("/")[1];

/**
 * FIXME replace w/ version from thi.ng/rstream once released
 */
export const fromNodeJS = <T>(
    stdout: Readable,
    stderr?: Readable,
    close = true
): Stream<T> => {
    const ingest = stream<T>();
    stdout.on("data", (data) => ingest.next(data));
    stderr && stderr.on("data", (data) => ingest.error(data));
    close && stdout.on("close", () => ingest.done());
    return ingest;
};

/**
 * FIXME replace w/ version from thi.ng/rstream once released
 */
export const linesFromNodeJS = (
    stdout: Readable,
    stderr?: Readable,
    re?: RegExp,
    close?: boolean
) =>
    <Subscription<string, string>>(
        fromNodeJS<string>(stdout, stderr, close).transform(rechunk(re))
    );

const rechunk =
    (re = /\r?\n/): Transducer<string, string> =>
    ([init, complete, reduce]: Reducer<any, string>) => {
        let buf = "";
        return [
            init,
            (acc: any) => {
                if (buf) acc = reduce(acc, buf);
                return complete(acc);
            },
            (acc: any, chunk: string) => {
                buf += chunk;
                const res = buf.split(re);
                if (res.length > 1) {
                    buf = res.pop()!;
                    for (let l of res) {
                        acc = reduce(acc, l);
                        if (isReduced(acc)) {
                            buf = "";
                            break;
                        }
                    }
                }
                return acc;
            },
        ];
    };
