import { coerceInt, flag, int, oneOfMulti, string } from "@thi.ng/args";
import { DEFAULT_CC_TYPES } from "../api.js";
import { CHANGELOG_TYPE_ORDER } from "../model/api.js";
import { illegalArgs } from "@thi.ng/errors";

export const ARG_ALL = {
	all: flag({
		alias: "a",
		desc: "Process all packages, not just unreleased",
	}),
};

export const ARG_CC_TYPES = {
	ccTypes: oneOfMulti(CHANGELOG_TYPE_ORDER.slice(1), {
		alias: "cc",
		hint: "TYPE",
		delim: ",",
		default: DEFAULT_CC_TYPES,
		desc: "Only consider given Conventional Commit types for determining changes",
	}),
};

export const ARG_DRY = {
	dryRun: flag({ desc: "Dry run" }),
};

export const ARG_DUMP_SPEC = {
	dumpSpec: string({
		hint: "PATH",
		desc: "Write release spec to JSON file",
	}),
};

export const ARG_OUT_DIR = {
	outDir: string({
		alias: "o",
		hint: "PATH",
		desc: "Output root dir (default: --repo-path)",
	}),
};

export const ARG_REPEAT = {
	maxRepeat: int({
		desc: "Max attempts",
		default: 3,
		coerce: (x: string) => {
			const val = coerceInt(x);
			return val > 0 && val < 32
				? val
				: illegalArgs("value must be in [1..31] range");
		},
	}),
};
