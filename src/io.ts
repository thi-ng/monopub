import { writeText as _write } from "@thi.ng/file-io";
import type { Logger } from "./logger.js";

export const writeText = (
    path: string,
    body: string,
    logger: Logger,
    dry = false
) => {
    if (dry) {
        logger.dry(dry, "writing file:", path);
        return;
    }
    _write(path, body, logger);
};

export const writeJSON = (
    path: string,
    body: any,
    logger: Logger,
    dry = false
) => {
    if (dry) {
        logger.dry(dry, "writing JSON:", path);
        return;
    }
    _write(path, JSON.stringify(body, null, 4) + "\n", logger);
};
