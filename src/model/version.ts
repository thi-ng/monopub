import type { Commit, VersionType } from "./api.js";

export const versionParts = (version: string) => version.split(".").map(Number);

export const classifyVersion = (version: string): VersionType => {
    const [_, minor, patch] = versionParts(version);
    return patch === 0 ? (minor === 0 ? "major" : "minor") : "patch";
};

export const classifyVersionBump = (
    id: string,
    commits: Commit[]
): VersionType => {
    let minor = false;
    for (let c of commits) {
        if (!c.pkgs.includes(id)) continue;
        if (c.breaking) return "major";
        if (c.type === "feat") minor = true;
    }
    return minor ? "minor" : "patch";
};

export const versionBump = (version: string, type: VersionType) => {
    const [m, n, p] = versionParts(version);
    switch (type) {
        case "major":
            return `${m + 1}.0.0`;
        case "minor":
            return `${m}.${n + 1}.0`;
        case "patch":
        default:
            return `${m}.${n}.${p + 1}`;
    }
};
