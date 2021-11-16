import { Args, string } from "@thi.ng/args";
import type { LogLevelName } from "@thi.ng/logger";
import {
    defFormatPresets,
    FMT_ANSI16,
    FMT_NONE,
    FormatPresets,
    StringFormat,
} from "@thi.ng/text-format";
import type { CLIOpts } from "./api.js";

export class AppConfig {
    logLevel: LogLevelName;
    fmt!: StringFormat;
    theme!: FormatPresets;

    specs: Args<CLIOpts>;

    constructor() {
        this.logLevel = <LogLevelName>process.env.NOTES_LOG_LEVEL || "INFO";
        this.specs = {
            repoPath: string({
                alias: "p",
                hint: "PATH",
                default: process.env.THING_MONOPUB_REPO_PATH || process.cwd(),
                desc: "Monorepo local path",
                group: "common",
            }),
            repoUrl: string({
                alias: "u",
                hint: "URL",
                default: process.env.THING_MONOPUB_REPO_URL || "<missing>",
                desc: "Monorepo remote URL",
                group: "common",
            }),
            scope: string({
                alias: "s",
                hint: "SCOPE",
                default: process.env.THING_MONOPUB_SCOPE,
                desc: "Package scope",
                group: "common",
            }),
            limitSha: string({
                alias: "sha",
                hint: "SHA1",
                desc: "Consider only commits newer than given hash",
                group: "common",
            }),
        };
        this.setFormat(process.env.NO_COLOR ? FMT_NONE : FMT_ANSI16);
    }

    setFormat(fmt: StringFormat) {
        this.fmt = fmt;
        this.theme = defFormatPresets(fmt);
    }
}
