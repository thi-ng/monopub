import { mkdirSync, readFileSync, writeFileSync } from "fs";
import type { Logger } from "./logger.js";

export const readJSON = (path: string) => JSON.parse(<any>readFileSync(path));

export const ensureDirectoryForFile = (path: string) =>
    mkdirSync(path.substr(0, path.lastIndexOf("/")), { recursive: true });

export const writeText = (
    path: string,
    body: string,
    logger: Logger,
    dry = false
) => {
    logger.dry(dry, "writing file:", path);
    if (dry) return;
    ensureDirectoryForFile(path);
    writeFileSync(path, body, "utf-8");
};

export const writeJSON = (
    path: string,
    body: any,
    logger: Logger,
    dry = false
) => {
    logger.dry(dry, "writing JSON:", path);
    if (dry) return;
    ensureDirectoryForFile(path);
    writeFileSync(path, JSON.stringify(body, null, 4) + "\n", "utf-8");
};
