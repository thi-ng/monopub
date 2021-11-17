import { LogLevel, LogLevelName } from "@thi.ng/logger";
import { defSystem } from "@thi.ng/system";
import { config } from "dotenv";
import { APP_NAME } from "./api.js";
import { CommandRegistry } from "./commands.js";
import { AppConfig } from "./config.js";
import { AppContext } from "./context.js";
import { Logger } from "./logger.js";
import { ArgParser } from "./parser.js";

interface App {
    args: ArgParser;
    commands: CommandRegistry;
    config: AppConfig;
    ctx: AppContext<any>;
    logger: Logger;
}

config();

(async () => {
    // main app
    const APP = defSystem<App>({
        config: {
            factory: () => new AppConfig(),
        },
        logger: {
            factory: ({ config }) =>
                new Logger(
                    config,
                    APP_NAME,
                    LogLevel[<LogLevelName>config.logLevel]
                ),
            deps: ["config"],
        },
        commands: {
            factory: () => new CommandRegistry(),
        },
        args: {
            factory: ({ logger, config, commands }) =>
                new ArgParser(logger, config, commands),
            deps: ["config", "logger", "commands"],
        },
        ctx: {
            factory: ({ logger, config, args }) =>
                new AppContext(config, logger, args),
            deps: ["config", "logger", "args"],
        },
    });

    try {
        await APP.start();
    } catch (e) {
        APP.components.logger.severe((<Error>e).message);
    }
})();
