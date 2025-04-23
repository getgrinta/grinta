import {
  APP_MODE,
  COMMAND_HANDLER,
  COMMAND_PRIORITY,
  ExecutableCommandSchema,
} from "@getgrinta/core";
import type { PluginContext } from "@getgrinta/plugin";

export function buildCreateNoteCommand(query: string, context: PluginContext) {
  const label =
    query.length > 0
      ? context.t("commands.actions.createNote", { query })
      : context.t("commands.actions.createDailyNote", {});
  return ExecutableCommandSchema.parse({
    label,
    localizedLabel: label,
    value: query,
    handler: COMMAND_HANDLER.CREATE_NOTE,
    priority: COMMAND_PRIORITY.MEDIUM,
    appModes: [APP_MODE.INITIAL, APP_MODE.NOTES],
  });
}
