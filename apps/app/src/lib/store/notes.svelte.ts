import { createFsStorage } from "$lib/storage";
import * as PathApi from "@tauri-apps/api/path";
import dayjs from "dayjs";
import { aiStore } from "./ai.svelte";
import { COMMAND_HANDLER, commandsStore } from "./commands.svelte";
import { settingsStore } from "./settings.svelte";

export type Note = {
	title: string;
	filename: string;
	path: string;
	updatedAt: string;
};

export type ExtendedNote = {
	title: string;
	filename: string;
	fullPath: string;
	content: string;
	updatedAt: string;
};

type UpdateNoteProps = {
	filename: string;
	content: string;
};

type RenameNoteProps = {
	filename: string;
	nextFilename: string;
};

async function findUnusedFilename(
	filename: string,
	counter = 0,
): Promise<string> {
	const fsStorage = createFsStorage(
		await PathApi.join(...settingsStore.settings.notesDir),
	);
	const uniqueFilename = counter === 0 ? filename : `${filename} (${counter})`;
	if (!(await fsStorage.exists(`${uniqueFilename}.md`))) {
		return uniqueFilename;
	}
	return await findUnusedFilename(filename, counter + 1);
}

export class NotesStore {
	notes = $state<Note[]>([]);

	async fetchNotes() {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		const noteFiles = await fsStorage.listItems();
		this.notes = noteFiles.map((file) => ({
			title: file.name.replace(".md", ""),
			filename: file.name,
			path: file.path,
			updatedAt: file.updatedAt ?? "",
		}));
	}

	async fetchNote(filename: string): Promise<ExtendedNote> {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		const file = await fsStorage.getItem(filename);
		if (!file) throw new Error("File not found");
		return {
			title: filename.replace(".md", ""),
			filename,
			fullPath: file.path,
			content: file.content ?? "",
			updatedAt: file.updatedAt ?? "",
		};
	}

	async createNote(name?: string) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		const ensuredName = name ?? dayjs().format("ll");
		const uniqueName = await findUnusedFilename(ensuredName);
		const filename = `${uniqueName}.md`;
		await fsStorage.setItem({ filename, content: "" });
		return filename;
	}

	async updateNote({ filename, content }: UpdateNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		return fsStorage.setItem({ filename, content });
	}

	async renameNote({ filename, nextFilename }: RenameNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		await fsStorage.renameItem({ filename, nextFilename });
		return commandsStore.removeHistoryEntry({
			value: filename,
			handler: COMMAND_HANDLER.OPEN_NOTE,
		});
	}

	async completePrompt({
		filename,
		prompt,
		callback,
	}: { filename: string; prompt: string; callback: (text: string) => void }) {
		const note = await this.fetchNote(filename);
		const result = aiStore.streamText(prompt);
		let content = note.content;

		for await (const chunk of result.textStream) {
			content = note.content + chunk;
			await this.updateNote({
				filename,
				content,
			});
			note.content = content;
			callback(content);
		}

		await this.updateNote({
			filename,
			content,
		});

		return note;
	}

	async deleteNote(filename: string) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		commandsStore.removeHistoryEntry({
			value: filename,
			handler: COMMAND_HANDLER.OPEN_NOTE,
		});
		return fsStorage.removeItem(filename);
	}

	async clearNotes() {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		await fsStorage.removeAll();
	}

	async getFullNotePath(filename: string) {
		return PathApi.join(...settingsStore.settings.notesDir, filename);
	}
}

export const notesStore = new NotesStore();
