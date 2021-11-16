import type { IObjectOf } from "@thi.ng/api";
import type { CommandSpec } from "./api.js";
import { CHANGELOG } from "./cmd/changelog.js";

export class CommandRegistry {
    registry: IObjectOf<CommandSpec<any>> = {
        changelog: CHANGELOG,
    };
}
