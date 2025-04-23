import {
  APP_MODE,
  COMMAND_HANDLER,
  ExecutableCommandSchema,
} from "@getgrinta/core";
import { createPlugin } from "@getgrinta/plugin";
import { buildCreateNoteCommand } from "./lib/notes";

export const PluginNotes = createPlugin({
  name: "Notes",
  async addSearchResults(query, context) {
    const createNoteCommand = buildCreateNoteCommand(query, context);
    const openNoteCommands = context.notes.map((note) =>
      ExecutableCommandSchema.parse({
        label: note.title,
        localizedLabel: note.title,
        value: note.filename,
        metadata: {
          path: note.path,
          updatedAt: new Date(note.updatedAt),
        },
        handler: COMMAND_HANDLER.OPEN_NOTE,
        appModes: [APP_MODE.INITIAL, APP_MODE.NOTES],
      }),
    );
    return [createNoteCommand, ...openNoteCommands];
  },
});
