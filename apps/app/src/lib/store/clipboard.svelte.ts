import { load } from "@tauri-apps/plugin-store";

export class ClipboardStore {
	clipboardHistory = $state<string[]>([]);

	async initialize() {
		const store = await load("clipboard.json");
		const clipboardHistory = (await store.get<string[]>("clipboard")) ?? [];
		if (!clipboardHistory) return;
		this.clipboardHistory = clipboardHistory;
	}

	async addSnapshot(snapshot: string) {
		const lastSnapshot =
			this.clipboardHistory[this.clipboardHistory.length - 1];
		if (snapshot === lastSnapshot) return;
		this.clipboardHistory.push(snapshot);
		await this.persist();
	}

	async clearClipboardHistory() {
		this.clipboardHistory = [];
		await this.persist();
	}

	async persist() {
		const store = await load("clipboard.json");
		await store.set("clipboard", this.clipboardHistory);
		await store.save();
	}
}

export const clipboardStore = new ClipboardStore();
