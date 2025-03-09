import { createFsStorage } from "$lib/storage";
import * as PathApi from "@tauri-apps/api/path";
import dayjs from "dayjs";
import { aiStore } from "./ai.svelte";
import { COMMAND_HANDLER, commandsStore } from "./commands.svelte";
import { settingsStore } from "./settings.svelte";

type StreamResult = {
	textStream: ReadableStream<string> & AsyncIterable<string>;
};

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
		await PathApi.join(...settingsStore.data.notesDir),
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
			await PathApi.join(...settingsStore.data.notesDir),
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
			await PathApi.join(...settingsStore.data.notesDir),
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
			await PathApi.join(...settingsStore.data.notesDir),
		);
		const ensuredName = name ?? dayjs().format("ll");
		const uniqueName = await findUnusedFilename(ensuredName);
		const filename = `${uniqueName}.md`;
		await fsStorage.setItem({ filename, content: "" });
		return filename;
	}

	async updateNote({ filename, content }: UpdateNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.data.notesDir),
		);
		return fsStorage.setItem({ filename, content });
	}

	async renameNote({ filename, nextFilename }: RenameNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.data.notesDir),
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
		isCompletionActive,
	}: { filename: string; prompt: string; isCompletionActive: () => boolean }) {
		const note = await this.fetchNote(filename);
		const textStream = aiStore.streamText({ prompt });
		let accumulatedContent = "";

		try {
			for await (const chunk of textStream) {
				if (!isCompletionActive()) {
					break;
				}

				if (!chunk || typeof chunk !== "string") {
					continue;
				}

				// Accumulate the text
				accumulatedContent += chunk;

				// Update the note state immediately
				note.content = accumulatedContent;

				// Debounce file updates to prevent overwhelming the file system
				await new Promise((resolve) => setTimeout(resolve, 50));

				// Update the file
				await this.updateNote({
					filename,
					content: accumulatedContent,
				});
			}

			// Ensure final state is saved
			if (isCompletionActive()) {
				await this.updateNote({
					filename,
					content: accumulatedContent,
				});
			}
		} catch (error) {
			console.error("Error during streaming:", error);
			throw error;
		}

		return note;
	}

	async deleteNote(filename: string) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.data.notesDir),
		);
		commandsStore.removeHistoryEntry({
			value: filename,
			handler: COMMAND_HANDLER.OPEN_NOTE,
		});
		return fsStorage.removeItem(filename);
	}

	async clearNotes() {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.data.notesDir),
		);
		await fsStorage.removeAll();
	}

	async getFullNotePath(filename: string) {
		return PathApi.join(...settingsStore.data.notesDir, filename);
	}
}

export const notesStore = new NotesStore();
