import { ConsoleLogger, LogLevel } from "@thi.ng/logger";
import type { AppConfig } from "./config.js";

export class Logger extends ConsoleLogger {
    constructor(protected config: AppConfig, id: string, level: LogLevel) {
        super(id, level);
    }

    dry(isDry: boolean, ...args: any[]) {
        this.log("INFO", isDry ? ["[dryrun]", ...args] : args);
    }

    protected log(level: string, args: any[]) {
        let msg = `[${level}] ${this.id}: ${args.join(" ")}\n`;
        const theme = this.config.theme;
        switch (level) {
            case "INFO":
                msg = theme.lightYellow(msg);
                break;
            case "WARN":
                msg = theme.lightRed(msg);
                break;
            case "SEVERE":
                msg = theme.red(msg);
                break;
            default:
        }
        process.stderr.write(msg);
    }
}
