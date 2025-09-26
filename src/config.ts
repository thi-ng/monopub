import { kvPairs, string, strings, type Args } from "@thi.ng/args";
import type { LogLevelName } from "@thi.ng/logger";
import {
	FMT_ANSI16,
	FMT_NONE,
	defFormatPresets,
	type FormatPresets,
	type StringFormat,
} from "@thi.ng/text-format";
import { REQUIRED, type CLIOpts } from "./api.js";

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
			indent: string({
				default: "\t",
				hint: "VAL",
				desc: "Indentation string for generated JSON files",
				group: "common",
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
