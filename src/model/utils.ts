import type { Commit } from "./api.js";

export const isPublish = (x: Commit) => x.title.toLowerCase() === "publish";

export const isBreakingChangeMsg = (x: string) =>
    x.startsWith("BREAKING CHANGE:");
