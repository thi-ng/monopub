import { assert } from "@thi.ng/errors";
import { seconds } from "@thi.ng/strings";
import { CLIOpts, CommandCtx, CommandSpec, REQUIRED } from "./api.js";
import type { AppConfig } from "./config.js";
import type { Logger } from "./logger.js";
import type { ArgParser } from "./parser.js";

export class AppContext<T extends CLIOpts> implements CommandCtx<T> {
    cmd!: CommandSpec<T>;
    opts!: T;
    rest!: string[];

    constructor(
        public config: AppConfig,
        public logger: Logger,
        public args: ArgParser
    ) {}

    async start() {
        const ctx = this.args.ctx!;
        this.cmd = ctx.cmd!;
        this.rest = ctx.rest!;
        this.opts = ctx.opts!;
        this.ensureParam("--repo-path", this.opts.repoPath);
        this.ensureParam("--repo-url", this.opts.repoUrl);
        this.ensureParam("--scope", this.opts.scope);
        const t0 = Date.now();
        await this.cmd.fn(this);
        this.logger.important(
            `completed in ${seconds((Date.now() - t0) / 1000)}`
        );
        return true;
    }

    ensureParam(id: string, val: string) {
        assert(val !== REQUIRED, `missing required ${id}`);
    }
}
