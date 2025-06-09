import { Command } from "@tauri-apps/plugin-shell";
import dedent from "dedent";
import z from "zod";

export const AppleNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  folder: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AppleNote = z.infer<typeof AppleNoteSchema>;

export async function runScript(script: string) {
  return Command.create("osascript", [
    "-l",
    "JavaScript",
    "-e",
    script,
  ]).execute();
}

export async function getNotes() {
  const script = dedent`
        const Notes = Application("Notes");
        Notes.includeStandardAdditions = true;

        const folders = Notes.folders();
        const notes = [];

        folders.forEach(function(folder) {
            return folder.notes().forEach(function(note) {
                notes.push({
                    id: note.id(),
                    title: note.name(),
                    folder: folder.name(),
                    createdAt: note.creationDate(),
                    updatedAt: note.modificationDate()
                })
            });
        });
        console.log(JSON.stringify(notes));
    `;
  const result = await runScript(script);
  return z.array(AppleNoteSchema).parse(JSON.parse(result.stderr));
}

export async function openNote(id: string) {
  const script = dedent`
        const Notes = Application("Notes");
        Notes.includeStandardAdditions = true;
        const note = Notes.notes.byId("${id}");
        Notes.activate();
        Notes.show(note);
    `;
  return runScript(script);
}

function formatNoteBody(title: string, body: string) {
  const titleTemplate = "<div><h1>" + title + "</h1></div>";
  if (!body) return titleTemplate;
  return titleTemplate + "\n" + "<div>" + body + "</div>";
}

export async function createNote(name: string, body?: string) {
  const noteName = name.length > 0 ? name : " ";
  const noteBody = body ? body : "";
  const script =
    "" +
    'const Notes = Application("Notes");\n' +
    "Notes.includeStandardAdditions = true;\n" +
    'const accountName = "iCloud";\n' +
    'const folderName = "Notes";\n' +
    "const account = Notes.accounts.byName(accountName);\n" +
    "const folder = account.folders.byName(folderName);\n" +
    "const newNote = Notes.Note({\n" +
    "    body: `" +
    formatNoteBody(noteName, noteBody) +
    "`\n" +
    "})\n" +
    "folder.notes.push(newNote);\n" +
    "const noteId = newNote.id().trim();\n" +
    "console.log(noteId);\n";
  const result = await runScript(script);
  return result?.stderr?.replace(/(\r\n|\n|\r)/gm, "");
}

export async function deleteNote(id: string) {
  const script = dedent`
        const Notes = Application("Notes");
        Notes.includeStandardAdditions = true;
        const note = Notes.notes.byId("${id}");
        note.delete();
    `;
  return runScript(script);
}
