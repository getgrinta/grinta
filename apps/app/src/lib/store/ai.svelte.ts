import { apiClient } from "$lib/utils.svelte";
import type { ContentType } from "@getgrinta/api";
import { settingsStore } from "./settings.svelte";

export class AiStore {
	streamText(prompt: string) {
		return apiClient.api.ai.stream.$post({
			json: {
				provider: "MISTRAL",
				model: "mistral-small-latest",
				prompt,
				context: settingsStore.data.aiAdditionalContext,
			},
		});
	}

	generateText({
		prompt,
		context,
		contentType,
	}: { prompt: string; context: string; contentType: ContentType }) {
		return apiClient.api.ai.generate.$post({
			json: {
				prompt,
				context,
				contentType,
			},
		});
	}
}

export const aiStore = new AiStore();
