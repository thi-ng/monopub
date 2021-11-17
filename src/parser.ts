import type { IObjectOf } from "@thi.ng/api";
import { DEFAULT_THEME, parse, usage, UsageOpts } from "@thi.ng/args";
import { padRight, repeat, wordWrapLine } from "@thi.ng/strings";
import type { FormatPresets } from "@thi.ng/text-format";
import { APP_NAME, CommandCtx, CommandSpec, HEADER } from "./api.js";
import type { CommandRegistry } from "./commands.js";
import type { AppConfig } from "./config.js";
import type { Logger } from "./logger.js";

const usageOpts: Partial<UsageOpts> = {
    lineWidth: process.stdout.columns,
    prefix: `${HEADER}
usage: ${APP_NAME} CMD [OPTS] ...
       ${APP_NAME} [CMD] --help

`,
    groups: ["flags", "main", "common"],
    showGroupNames: true,
};

export class ArgParser {
    ctx?: Partial<CommandCtx<any>>;

    constructor(
        public logger: Logger,
        public config: AppConfig,
        public commands: CommandRegistry
    ) {}

    async start() {
        const commands = this.commands.registry;
        try {
            const cmd = process.argv[3];
            const cmdSpec = commands[cmd];
            if (cmdSpec) {
                const args = parse(
                    <any>{ ...this.config.specs, ...cmdSpec.opts },
                    process.argv,
                    {
                        start: 4,
                        usageOpts: {
                            ...usageOpts,
                            color: this.config.isColor ? DEFAULT_THEME : false,
                            prefix: commandUsagePrefix(
                                cmd,
                                cmdSpec,
                                this.config.theme
                            ),
                        },
                    }
                );
                if (args) {
                    this.ctx = {
                        cmd: cmdSpec,
                        opts: args.result,
                        rest: args.rest,
                    };
                    return true;
                }
            } else {
                process.stdout.write(
                    usage(this.config.specs, {
                        ...usageOpts,
                        color: this.config.isColor ? DEFAULT_THEME : false,
                        prefix: commonUsagePrefix(commands),
                    })
                );
            }
        } catch (e) {
            this.logger.severe((<Error>e).message);
        }
        return false;
    }
}

const commandOverview = (id: string, usage: string) =>
    `    ${padRight(10, " ")(id)}∷ ${wordWrapLine(firstSentence(usage), {
        width: process.stdout.columns - 16,
    })
        .map((l, i) => (i > 0 ? repeat(" ", 16) + l : l))
        .join("\n")}`;

const commonUsagePrefix = (commands: IObjectOf<CommandSpec<any>>) =>
    [
        usageOpts.prefix,
        `Available commands:\n`,
        ...Object.keys(commands).map((id) =>
            commandOverview(id, commands[id].usage)
        ),
        "\n",
    ].join("\n");

const commandUsagePrefix = (
    id: string,
    spec: CommandSpec<any>,
    theme: FormatPresets
) =>
    usageOpts.prefix +
    [
        `Current command '${id}':`,
        "",
        highlightArgs(spec.usage, theme),
        "\n",
    ].join("\n");

export const firstSentence = (x: string) => {
    const idx = x.indexOf(".");
    return idx > 0 ? x.substr(0, idx) : x;
};

export const highlightArgs = (x: string, theme: FormatPresets) =>
    x.replace(/`(-[a-z-]+)`/g, (_, opt) => theme.cyan(opt));
