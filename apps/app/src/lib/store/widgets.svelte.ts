import { z } from "zod";
import { appStore } from "./app.svelte";
import { APP_MODE, ExecutableCommandSchema } from "@getgrinta/core";
import { SecureStore } from "./secure.svelte";

export const WidgetSchema = z.object({
	type: z.enum(["command"]),
	data: ExecutableCommandSchema,
});

type Widget = z.infer<typeof WidgetSchema>;

export const WidgetsSchema = z.object({
	widgets: z.array(WidgetSchema).default([]),
});

type Widgets = z.infer<typeof WidgetsSchema>;

export class WidgetsStore extends SecureStore<Widgets> {
	showWidgets = $derived(
		this.data.widgets?.length > 0 &&
			appStore.query.length === 0 &&
			appStore.appMode === APP_MODE.INITIAL,
	);

	async initialize() {
		await this.restore();
	}

	addWidget(widget: Widget) {
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

	moveWidget(currentIndex: number, targetIndex: number) {
		if (
			currentIndex < 0 ||
			currentIndex >= this.data.widgets.length ||
			targetIndex < 0 ||
			targetIndex >= this.data.widgets.length ||
			currentIndex === targetIndex
		) {
			return;
		}

		const widgets = [...this.data.widgets];
		const [widget] = widgets.splice(currentIndex, 1);
		widgets.splice(targetIndex, 0, widget);

		this.updateData({ widgets });
	}
}

export const widgetsStore = new WidgetsStore({
	schema: WidgetsSchema,
	fileName: "widgets.json",
	storageKey: "widgets",
});
