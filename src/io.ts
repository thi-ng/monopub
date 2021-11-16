import { readFileSync, writeFileSync } from "fs";
import type { Logger } from "./logger";

export const readJSON = (path: string) => JSON.parse(<any>readFileSync(path));

export const writeText = (
    path: string,
    body: string,
    logger: Logger,
    dry = false
) => {
    logger.dry(dry, "writing file:", path);
    writeFileSync(path, body, "utf-8");
};
