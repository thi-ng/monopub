import { Args, kvPairs, oneOf, string, strings } from "@thi.ng/args";
import { illegalArgs } from "@thi.ng/errors";
import type { LogLevelName } from "@thi.ng/logger";
import {
	defFormatPresets,
	FMT_ANSI16,
	FMT_NONE,
	FormatPresets,
	StringFormat,
} from "@thi.ng/text-format";
import { CLIOpts, REQUIRED } from "./api.js";

export class AppConfig {
	logLevel: LogLevelName;
	fmt!: StringFormat;
	theme!: FormatPresets;

	specs: Args<CLIOpts>;

	constructor() {
		this.logLevel = <LogLevelName>process.env.MONOPUB_LOG_LEVEL || "INFO";
		this.specs = {
			repoPath: string({
				alias: "p",
				hint: "PATH",
				default: process.env.MONOPUB_REPO_PATH || REQUIRED,
				desc: "Monorepo local path",
				group: "common",
			}),
			repoUrl: string({
				alias: "u",
				hint: "URL",
				default: process.env.MONOPUB_REPO_URL || REQUIRED,
				desc: "Monorepo remote URL",
				group: "common",
			}),
			scope: string({
				alias: "s",
				hint: "SCOPE",
				default: process.env.MONOPUB_SCOPE || REQUIRED,
				desc: "Package scope",
				group: "common",
			}),
			root: string({
				alias: "r",
				hint: "PATH",
				default: process.env.MONOPUB_PKG_ROOT || "packages",
				desc: "Relative package root dir in repo",
				group: "common",
			}),
			ext: strings({
				delim: ",",
				hint: "EXT",
				default: [".+"],
				desc: "File types to consider for changes (comma separated)",
				group: "common",
			}),
			alias: kvPairs({
				alias: "A",
				default: {},
				desc: "Alias pkg names (old=new)",
				group: "common",
			}),
			indent: oneOf(["number", "tab"], {
				default: "\t",
				hint: "VAL",
				desc: "Indentation for generated JSON files",
				group: "common",
				coerce: (x) => {
					if (x === "tab") return "\t";
					const y = parseInt(x);
					if (isNaN(y) || y < 0) illegalArgs("invalid indent");
					return y;
				},
			}),
		};
		this.setFormat(process.env.NO_COLOR ? FMT_NONE : FMT_ANSI16);
	}

	get isColor() {
		return this.fmt !== FMT_NONE;
	}

	setFormat(fmt: StringFormat) {
		this.fmt = fmt;
		this.theme = defFormatPresets(fmt);
	}
}
