import { APP_MODE, COMMAND_HANDLER, COMMAND_PRIORITY, ExecutableCommandSchema } from "@getgrinta/core";
import type { PluginContext } from "@getgrinta/plugin";

export function buildCreateNoteCommand(query: string, context: PluginContext) {
    return ExecutableCommandSchema.parse({
        label: context.t("commands.actions.createNote", { query }),
        localizedLabel: context.t("commands.actions.createNote", { query }),
        value: query,
        handler: COMMAND_HANDLER.CREATE_NOTE,
        priority: COMMAND_PRIORITY.MEDIUM,
        appModes: [APP_MODE.INITIAL, APP_MODE.NOTES],
    })
}
