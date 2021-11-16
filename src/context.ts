import type { CLIOpts, CommandCtx, CommandSpec } from "./api.js";
import type { AppConfig } from "./config.js";
import type { Logger } from "./logger.js";
import type { ArgParser } from "./parser.js";

export class AppContext<T extends CLIOpts = any> implements CommandCtx<T> {
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
        await this.cmd.fn(this);
        return true;
    }
}
