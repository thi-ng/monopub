import type { IObjectOf } from "@thi.ng/api";
import type { CommandSpec } from "./api.js";
import { CHANGELOG } from "./cmd/changelog.js";
import { RELEASE } from "./cmd/release.js";
import { VERSION } from "./cmd/version.js";

export class CommandRegistry {
    registry: IObjectOf<CommandSpec<any>> = {
        changelog: CHANGELOG,
        release: RELEASE,
        version: VERSION,
    };
}
