import type { Fn } from "@thi.ng/api";
import type { Args } from "@thi.ng/args";
import { resolve } from "path";
import type { AppConfig } from "./config.js";
import { readJSON } from "./io.js";
import type { Logger } from "./logger.js";
import { pkgShortName } from "./utils.js";

export interface CLIOpts {
    /**
     * Local monorepo path/root dir
     */
    repoPath: string;
    /**
     * Remote monorepo base URL (e.g. https://github.com/thi-ng/umbrella) - NO trailing slash!
     */
    repoUrl: string;
    /**
     * Common package scope for all packages in the monorepo, e.g. `@thi.ng`.
     */
    scope?: string;
    /**
     * Only process commits newer than given SHA1.
     */
    limitSha?: string;
}

export interface DryRunOpts {
    dryRun: boolean;
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
