import { LogLevel, type LogLevelName } from "@thi.ng/logger";
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
			factory: async () => new AppConfig(),
		},
		logger: {
			factory: async ({ config }) =>
				new Logger(
					config,
					APP_NAME,
					LogLevel[<LogLevelName>config.logLevel]
				),
			deps: ["config"],
		},
		commands: {
			factory: async () => new CommandRegistry(),
		},
		args: {
			factory: async ({ logger, config, commands }) =>
				new ArgParser(logger, config, commands),
			deps: ["config", "logger", "commands"],
		},
		ctx: {
			factory: async ({ logger, config, args }) =>
				new AppContext(config, logger, args),
			deps: ["config", "logger", "args"],
		},
	});

	try {
		await APP.start();
	} catch (e) {
		APP.components.logger.severe((<Error>e).message);
		console.log(e);
	}
})();
