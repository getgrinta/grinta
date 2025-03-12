import { z } from "zod";
import { BAR_MODE, appStore } from "./app.svelte";
import {
	type ExecutableCommand,
	ExecutableCommandSchema,
} from "./commands.svelte";
import { SecureStore } from "./secure.svelte";

export const WidgetsSchema = z.object({
	widgets: z.array(ExecutableCommandSchema).default([]),
});

type Widgets = z.infer<typeof WidgetsSchema>;

export class WidgetsStore extends SecureStore<Widgets> {
	showWidgets = $derived(
		this.data.widgets?.length > 0 &&
			appStore.query.length === 0 &&
			appStore.barMode === BAR_MODE.INITIAL,
	);

	async initialize() {
		await this.restore();
	}

	addWidget(widget: ExecutableCommand) {
		const widgets = this.data.widgets ?? [];
		this.updateData({
			widgets: [...widgets, widget],
		});
	}

	removeWidget(index: number) {
		this.updateData({
			widgets: this.data.widgets.filter((_, i) => i !== index),
		});
	}
}

export const widgetsStore = new WidgetsStore({
	schema: WidgetsSchema,
	fileName: "widgets.json",
	storageKey: "widgets",
});
