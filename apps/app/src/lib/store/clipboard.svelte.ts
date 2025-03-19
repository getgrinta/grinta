import { z } from "zod";
import { SecureStore } from "./secure.svelte";

export const ClipboardSchema = z.object({
	clipboardHistory: z.array(z.string()).default([]),
});

type Clipboard = z.infer<typeof ClipboardSchema>;

export class ClipboardStore extends SecureStore<Clipboard> {
	async initialize() {
		await this.restore();
	}

	async addSnapshot(snapshot: string) {
		const lastSnapshot =
			this.data.clipboardHistory[this.data.clipboardHistory.length - 1];
		if (snapshot === lastSnapshot) return;

		const maxClipboardSize = 50
		const newClipboardHistory = [...this.data.clipboardHistory.slice(0, maxClipboardSize - 1), snapshot];

		this.updateData({
			clipboardHistory: newClipboardHistory,
		});
	}

	async clearClipboardHistory() {
		this.updateData({ clipboardHistory: [] });
	}
}

export const clipboardStore = new ClipboardStore({
	schema: ClipboardSchema,
	fileName: "clipboard.json",
	storageKey: "clipboard",
});
