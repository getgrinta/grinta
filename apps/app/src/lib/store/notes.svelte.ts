import { createFsStorage } from "$lib/storage";
import * as PathApi from "@tauri-apps/api/path";
import dayjs from "dayjs";
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
		await fsStorage.setItem({ filename, update: { filename, content: "" } });
		return filename;
	}

	async updateNote({ filename, content }: UpdateNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		return fsStorage.setItem({ filename, update: { filename, content } });
	}

	async renameNote({ filename, nextFilename }: RenameNoteProps) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		await fsStorage.setItem({ filename, update: { filename: nextFilename } });
		return commandsStore.removeHistoryEntry({
			value: filename,
			handler: COMMAND_HANDLER.OPEN_NOTE,
		});
	}

	async completePrompt(id: string) {
		// const index = this.chats.findIndex((chat) => chat.id === id);
		// const chat = this.chats[index];
		// if (chat.state !== "idle") throw new Error("Chat already completed");
		// this.chats[index].state = "responding";
		// await this.persist();
		// const { textStream } = streamText({
		// 	model: this.aiClient(settingsStore.settings.aiModelName),
		// 	prompt: chat.prompt,
		// });
		// for await (const textPart of textStream) {
		// 	this.addPartToResponse({ id, part: textPart });
		// }
		// this.chats[index].state = "responded";
		// await this.persist();
	}

	async deleteNote(filename: string) {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		return fsStorage.removeItem(filename);
	}

	async clearNotes() {
		const fsStorage = createFsStorage(
			await PathApi.join(...settingsStore.settings.notesDir),
		);
		await fsStorage.removeAll();
	}
}

export const notesStore = new NotesStore();
