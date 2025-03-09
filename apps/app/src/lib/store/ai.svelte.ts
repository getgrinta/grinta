import { getApiClient, getHeaders } from "$lib/utils.svelte";
import type { ContentType } from "@getgrinta/api";
import { fetch } from "@tauri-apps/plugin-http";
import { settingsStore } from "./settings.svelte";

export class AiStore {
	async *streamText({ prompt }: { prompt: string }) {
		const apiClient = getApiClient();
		const url = new URL(apiClient.api.ai.stream.$url());
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify({
				prompt,
				model: "mistral-small-latest",
				provider: "MISTRAL",
				context: settingsStore.data.aiAdditionalContext,
			}),
			headers: getHeaders(),
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		if (!response.body) {
			throw new Error("Response has no body");
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}
				yield decoder.decode(value);
			}
		} finally {
			reader.releaseLock();
		}
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
