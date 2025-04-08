import { getApiClient } from "$lib/utils.svelte";
import type { ContentType } from "@getgrinta/api";

export class AiStore {
	grintAiResult = $state<string>()

	async fetchGrintAiResult(query: string) {
		const result = await this.generateText({
			prompt: query,
			context: "",
			contentType: "GRINTAI",
		});
		const { text } = await result.json()
		this.grintAiResult = text
	}

	generateText({
		prompt,
		context,
		contentType,
	}: { prompt: string; context: string; contentType: ContentType }) {
		const apiClient = getApiClient();
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
