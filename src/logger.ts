import { ConsoleLogger, LogLevel, type LogEntry } from "@thi.ng/logger";
import type { AppConfig } from "./config.js";

export class Logger extends ConsoleLogger {
	constructor(protected config: AppConfig, id: string, level: LogLevel) {
		super(id, level);
	}

	dry(isDry: boolean, ...args: any[]) {
		this.level <= LogLevel.INFO &&
			this.logEntry([
				LogLevel.INFO,
				this.id,
				Date.now(),
				...(isDry ? ["[dryrun]", ...args] : args),
			]);
	}

	important(...args: any[]) {
		this.level <= LogLevel.NONE &&
			this.logEntry([LogLevel.INFO, this.id, Date.now(), ...args]);
	}

	logEntry([level, id, _, ...args]: LogEntry) {
		let msg = `[${LogLevel[level]}] ${id}: ${args.join(" ")}\n`;
		const theme = this.config.theme;
		switch (level) {
			case LogLevel.INFO:
				msg = theme.lightYellow(msg);
				break;
			case LogLevel.WARN:
				msg = theme.lightRed(msg);
				break;
			case LogLevel.SEVERE:
				msg = theme.red(msg);
				break;
			default:
		}
		process.stderr.write(msg);
	}
}
