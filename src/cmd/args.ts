import { flag, string } from "@thi.ng/args";

export const ARG_DRY = {
    dryRun: flag({ desc: "Dry run" }),
};

export const ARG_DUMP_SPEC = {
    dumpSpec: string({
        hint: "PATH",
        desc: "Write release spec to JSON file",
    }),
};

export const ARG_OUT_DIR = {
    outDir: string({
        alias: "o",
        hint: "PATH",
        desc: "Output root dir for changelogs (default: --repo-path)",
    }),
};
