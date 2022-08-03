import type { Fn, NumOrString } from "@thi.ng/api";
import type { Args, KVDict } from "@thi.ng/args";
import { readJSON } from "@thi.ng/file-io";
import { resolve } from "path";
import type { AppConfig } from "./config.js";
import type { Logger } from "./logger.js";
import { pkgShortName } from "./model/package.js";

export interface CLIOpts {
	/**
	 * Same as {@link RepoConfig.path}
	 */
	repoPath: string;
	/**
	 * Same as {@link RepoConfig.url}
	 */
	repoUrl: string;
	/**
	 * Same as {@link RepoConfig.scope}
	 */
	scope: string;
	/**
	 * Same as {@link RepoConfig.pkgRoot}
	 */
	root: string;
	/**
	 * Same as {@link RepoConfig.fileExt}
	 */
	ext: string[];
	/**
	 * Same as {@link RepoConfig.alias}
	 */
	alias: KVDict;
	/**
	 * Indentation for generated JSON files
	 */
	indent: NumOrString;
}

export interface AllPkgOpts {
	all: boolean;
}

export interface CCTypeOpts {
	ccTypes: string[];
}

export interface DryRunOpts {
	dryRun: boolean;
}

export interface DumpSpecOpts {
	dumpSpec?: string;
}

export interface OutDirOpts {
	outDir?: string;
}

export interface CommandSpec<T extends CLIOpts> {
	/**
	 * Actual command implementation
	 */
	fn: Fn<CommandCtx<T>, Promise<void>>;
	/**
	 * Command specific CLI arg specs
	 */
	opts: Args<T>;
	/**
	 * Usage string for command overview.
	 */
	usage: string;
}

export interface CommandCtx<T extends CLIOpts> {
	cmd: CommandSpec<T>;
	config: AppConfig;
	logger: Logger;
	opts: T;
	rest: string[];
}

export const INSTALL_DIR = resolve(`${process.argv[2]}/..`);

export const PKG = readJSON(`${INSTALL_DIR}/package.json`);

export const APP_NAME = pkgShortName(PKG.name);

export const HEADER = `
 █ █   █           │
██ █               │
 █ █ █ █   █ █ █ █ │ ${PKG.name} ${PKG.version}
 █ █ █ █ █ █ █ █ █ │ ${PKG.description}
                 █ │
               █ █ │
`;

export const REQUIRED = "<required>";

export const DEFAULT_CHANGELOG_BRANCH = "main";

export const DEFAULT_RELEASE_BRANCH = "main";

export const DEFAULT_CC_TYPES = ["feat", "fix", "refactor", "perf"];
