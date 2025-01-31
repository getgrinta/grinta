import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { settingsStore } from "./settings.svelte";

export class AiStore {
	bearerToken = $derived(`Bearer ${settingsStore.settings.aiSecretKey}`);
	client = $derived(
		createOpenAICompatible({
			name: "grinta",
			headers: {
				Authorization: this.bearerToken,
			},
			baseURL: settingsStore.settings.aiEndpointUrl,
		}),
	);
}

export const aiStore = new AiStore();
